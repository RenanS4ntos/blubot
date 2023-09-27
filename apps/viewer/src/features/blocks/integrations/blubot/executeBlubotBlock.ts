import {
  SessionState,
  ReplyLog,
  AnswerInSessionState,
  Variable,
} from '@typebot.io/schemas'

import { omit } from '@typebot.io/lib'
import got, { HTTPError, Method, OptionsInit } from 'got'
import { ExecuteIntegrationResponse } from '@/features/chat/types'
import {
  Blubot,
  BlubotBlock,
  ExecutableBlubot,
} from '@typebot.io/schemas/features/blocks/integrations/blubot'
import { HttpMethod } from '@typebot.io/schemas/features/blocks/integrations/webhook/enums'
import { parseVariables } from '@/features/variables/parseVariables'
import { getDefinedVariables, parseAnswers } from '@typebot.io/lib/results'
import { resumeBlubotExecution } from './resumeBlubotExecution'
// import prisma from '@/lib/prisma'

// passar teamId, forwardingId caso houver attendantId
// retornar o protocolo de atendimento

type ParsedBlubot = ExecutableBlubot & {
  isJson: boolean
}

type BlubotResponse = {
  statusCode: number
  data?: {
    message?: string
    protocol: string
  }
}

export const executeBlubotBlock = async (
  state: SessionState,
  block: BlubotBlock
): Promise<ExecuteIntegrationResponse> => {
  const logs: ReplyLog[] = []
  const blubot = block.options.blubot ? (block.options.blubot as Blubot) : null

  if (!blubot) {
    logs.push({
      status: 'error',
      description: `Couldn't find blubot with id ${block.blubotId}`,
    })
    return { outgoingEdgeId: block.outgoingEdgeId, logs }
  }

  const preparedBlubot = prepareBlubotAttributes(blubot)
  const parsedBlubot = await parseBlubotAttributes(
    state,
    state.typebotsQueue[0].answers
  )(preparedBlubot)
  if (!parsedBlubot) {
    logs.push({
      status: 'error',
      description: `Couldn't parse blubot attributes`,
    })
    return { outgoingEdgeId: block.outgoingEdgeId, logs }
  }
  const { response: blubotResponse, logs: executeBlubotLogs } =
    await executeBlubot(parsedBlubot)
  return resumeBlubotExecution({
    state,
    block,
    logs: executeBlubotLogs,
    response: blubotResponse,
  })
}

const prepareBlubotAttributes = (blubot: Blubot): Blubot => {
  return blubot
}

const checkIfBodyIsAVariable = (body: string) => /^{{.+}}$/.test(body)

const parseBlubotAttributes =
  (state: SessionState, answers: AnswerInSessionState[]) =>
  async (blubot: Blubot): Promise<ParsedBlubot | undefined> => {
    if (!blubot.url || !blubot.method) return
    const { typebot } = state.typebotsQueue[0]

    const bodyContent = await getBodyContent({
      body: JSON.stringify(blubot.body),
      answers,
      variables: typebot.variables,
    })
    const { data: body, isJson } =
      bodyContent && blubot.method !== HttpMethod.GET
        ? safeJsonParse(
            parseVariables(typebot.variables, {
              isInsideJson: !checkIfBodyIsAVariable(bodyContent),
            })(bodyContent)
          )
        : { data: undefined, isJson: false }

    return {
      url: parseVariables(typebot.variables)(blubot.url),
      method: blubot.method,
      body,
      isJson,
    }
  }

export const executeBlubot = async (
  blubot: ParsedBlubot
): Promise<{ response: BlubotResponse; logs?: ReplyLog[] }> => {
  const logs: ReplyLog[] = []
  const { url, method, body, isJson } = blubot
  const contentType = 'application/json'

  const request = {
    url,
    method: method as Method,
    json:
      !contentType?.includes('x-www-form-urlencoded') && body && isJson
        ? body
        : undefined,
    form:
      contentType?.includes('x-www-form-urlencoded') && body ? body : undefined,
    body: body && !isJson ? (body as string) : undefined,
  } satisfies OptionsInit
  try {
    const response = await got(request.url, omit(request, 'url'))
    logs.push({
      status: 'success',
      description: `Blubot successfuly executed.`,
      details: {
        statusCode: response.statusCode,
        request,
        response: safeJsonParse(response.body).data,
      },
    })
    return {
      response: {
        statusCode: response.statusCode,
        data: safeJsonParse(response.body).data,
      },
      logs,
    }
  } catch (error) {
    if (error instanceof HTTPError) {
      const response = {
        statusCode: error.response.statusCode,
        data: safeJsonParse(error.response.body as string).data,
      }
      logs.push({
        status: 'error',
        description: `blubot returned an error.`,
        details: {
          statusCode: error.response.statusCode,
          request,
          response,
        },
      })
      return { response, logs }
    }
    const response = {
      statusCode: 500,
      data: { message: `Error from Typebot server: ${error}`, protocol: '' },
    }

    console.error(error)
    logs.push({
      status: 'error',
      description: `blubot failed to execute.`,
      details: {
        request,
        response,
      },
    })
    return { response, logs }
  }
}

const getBodyContent = async ({
  body,
  answers,
  variables,
}: {
  body?: string | null
  answers: AnswerInSessionState[]
  variables: Variable[]
}): Promise<string | undefined> => {
  if (!body) return
  return body === '{{state}}'
    ? JSON.stringify(
        parseAnswers({
          answers,
          variables: getDefinedVariables(variables),
        })
      )
    : body
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const safeJsonParse = (json: string): { data: any; isJson: boolean } => {
  try {
    return { data: JSON.parse(json), isJson: true }
  } catch (err) {
    return { data: json, isJson: false }
  }
}
