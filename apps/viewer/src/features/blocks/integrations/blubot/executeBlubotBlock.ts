import { SessionState, ReplyLog } from '@typebot.io/schemas'

import { omit } from '@typebot.io/lib'
import got, { HTTPError, OptionsInit } from 'got'
import { ExecuteIntegrationResponse } from '@/features/chat/types'
import {
  BlubotBlock,
  BlubotOptions,
} from '@typebot.io/schemas/features/blocks/integrations/blubot'
import { resumeBlubotExecution } from './resumeBlubotExecution'

// passar teamId, forwardingId caso houver attendantId
// retornar o protocolo de atendimento

type BlubotResponse = {
  statusCode: number
  data?: {
    protocol: string
  }
}

export const executeBlubotBlock = async (
  state: SessionState,
  block: BlubotBlock
): Promise<ExecuteIntegrationResponse> => {
  const { options } = block

  // const preparedWebhook = prepareWebhookAttributes(webhook, block.options)
  // const parsedWebhook = await parseWebhookAttributes(
  //   state,
  //   state.typebotsQueue[0].answers
  // )(preparedWebhook)
  // if (!parsedWebhook) {
  //   logs.push({
  //     status: 'error',
  //     description: `Couldn't parse webhook attributes`,
  //   })
  //   return { outgoingEdgeId: block.outgoingEdgeId, logs }
  // }
  // if (block.options.isExecutedOnClient && !state.whatsApp)
  //   return {
  //     outgoingEdgeId: block.outgoingEdgeId,
  //     clientSideActions: [
  //       {
  //         webhookToExecute: parsedWebhook,
  //         expectsDedicatedReply: true,
  //       },
  //     ],
  //   }

  const { response: webhookResponse, logs: executeWebhookLogs } =
    await executeWebhook(options)
  return resumeBlubotExecution({
    state,
    block,
    logs: executeWebhookLogs,
    response: webhookResponse,
  })
}

// const prepareWebhookAttributes = (
//   webhook: Webhook,
//   options: WebhookOptions
// ): Webhook => {
//   if (options.isAdvancedConfig === false) {
//     return { ...webhook, body: '{{state}}', ...defaultWebhookAttributes }
//   } else if (options.isCustomBody === false) {
//     return { ...webhook, body: '{{state}}' }
//   }
//   return webhook
// }

// const checkIfBodyIsAVariable = (body: string) => /^{{.+}}$/.test(body)

// const parseWebhookAttributes =
//   (state: SessionState, answers: AnswerInSessionState[]) =>
//   async (webhook: Webhook): Promise<ParsedWebhook | undefined> => {
//     if (!webhook.url || !webhook.method) return
//     const { typebot } = state.typebotsQueue[0]
//     const basicAuth: { username?: string; password?: string } = {}
//     const basicAuthHeaderIdx = webhook.headers.findIndex(
//       (h) =>
//         h.key?.toLowerCase() === 'authorization' &&
//         h.value?.toLowerCase()?.includes('basic')
//     )
//     const isUsernamePasswordBasicAuth =
//       basicAuthHeaderIdx !== -1 &&
//       webhook.headers[basicAuthHeaderIdx].value?.includes(':')
//     if (isUsernamePasswordBasicAuth) {
//       const [username, password] =
//         webhook.headers[basicAuthHeaderIdx].value?.slice(6).split(':') ?? []
//       basicAuth.username = username
//       basicAuth.password = password
//       webhook.headers.splice(basicAuthHeaderIdx, 1)
//     }
//     const headers = convertKeyValueTableToObject(
//       webhook.headers,
//       typebot.variables
//     ) as ExecutableWebhook['headers'] | undefined
//     const queryParams = stringify(
//       convertKeyValueTableToObject(webhook.queryParams, typebot.variables)
//     )
//     const bodyContent = await getBodyContent({
//       body: webhook.body,
//       answers,
//       variables: typebot.variables,
//     })
//     const { data: body, isJson } =
//       bodyContent && webhook.method !== HttpMethod.GET
//         ? safeJsonParse(
//             parseVariables(typebot.variables, {
//               isInsideJson: !checkIfBodyIsAVariable(bodyContent),
//             })(bodyContent)
//           )
//         : { data: undefined, isJson: false }

//     return {
//       url: parseVariables(typebot.variables)(
//         webhook.url + (queryParams !== '' ? `?${queryParams}` : '')
//       ),
//       basicAuth,
//       method: webhook.method,
//       headers,
//       body,
//       isJson,
//     }
//   }

export const executeWebhook = async (
  body: BlubotOptions
): Promise<{ response: BlubotResponse; logs?: ReplyLog[] }> => {
  const logs: ReplyLog[] = []
  const url = 'https://blubot-api.onrender.com/service'

  const request = {
    url,
    method: 'POST',
    json: 'application/json',
    body: JSON.stringify(body),
  } satisfies OptionsInit
  try {
    const response = await got(request.url, omit(request, 'url'))
    logs.push({
      status: 'success',
      description: `Webhook successfuly executed.`,
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
        description: `Webhook returned an error.`,
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
      data: { protocol: '' },
    }
    console.error(error)
    logs.push({
      status: 'error',
      description: `Blubot failed to execute.`,
      details: {
        request,
        response,
      },
    })

    return { response, logs }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const safeJsonParse = (json: string): { data: any; isJson: boolean } => {
  try {
    return { data: JSON.parse(json), isJson: true }
  } catch (err) {
    return { data: json, isJson: false }
  }
}
