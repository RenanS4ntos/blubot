import { z } from 'zod'
import { blockBaseSchema } from '../baseSchemas'
import { IntegrationBlockType } from './enums'
import { HttpMethod } from './webhook/enums'

export interface BlubotResponseType {
  message?: string
  protocol: string
}

const responseVariableMappingSchema = z.object({
  id: z.string(),
  variableId: z.string().optional(),
  bodyPath: z.string().optional(),
})

export const blubotSchema = z.object({
  id: z.string(),
  method: z.nativeEnum(HttpMethod),
  url: z.string(),
  body: z.object({
    teamId: z.string(),
    forwardingId: z.string(),
    attendantId: z.string().optional(),
  }),
})

export const blubotOptionsSchema = z.object({
  responseVariableMapping: z.array(responseVariableMappingSchema),
  blubot: blubotSchema.optional(),
})

export const blubotBlockSchema = blockBaseSchema.merge(
  z.object({
    type: z.enum([IntegrationBlockType.BLUBOT]),
    options: blubotOptionsSchema,
    blubotId: z
      .string()
      .describe('Deprecated, now integrated in webhook block options')
      .optional(),
  })
)

export const defaultBlubotBody = {
  teamId: '',
  forwardingId: '',
  attendantId: '',
}

export const defaultBlubotAttributes: Omit<
  Blubot,
  'id' | 'url' | 'typebotId' | 'createdAt' | 'updatedAt'
> = {
  method: HttpMethod.POST,
  body: defaultBlubotBody,
}

export const defaultBlubotOptions = (blubotId: string): BlubotOptions => ({
  responseVariableMapping: [
    {
      id: 'protocol',
      variableId: 'protocol',
      bodyPath: 'data.protocol',
    },
  ],
  blubot: {
    id: blubotId,
    url: 'https://blubot-api.onrender.com/service',
    ...defaultBlubotAttributes,
  },
})

export const executableBlubotSchema = z.object({
  url: z.string(),
  body: z.unknown().optional(),
  method: z.nativeEnum(HttpMethod).optional(),
})

export type KeyValue = { id: string; key?: string; value?: string }

export type BlubotResponse = {
  statusCode: number
  data?: unknown | BlubotResponseType
}

export type ExecutableBlubot = z.infer<typeof executableBlubotSchema>

export type Blubot = z.infer<typeof blubotSchema>
export type BlubotBlock = z.infer<typeof blubotBlockSchema>
export type BlubotOptions = z.infer<typeof blubotOptionsSchema>
export type ResponseVariableMapping = z.infer<
  typeof responseVariableMappingSchema
>
