import { SetVariableLabel } from '@/components/SetVariableLabel'
import { useTypebot } from '@/features/editor/providers/TypebotProvider'
import { Stack, Text } from '@chakra-ui/react'
import { BlubotBlock } from '@typebot.io/schemas/features/blocks/integrations/blubot'

type Props = {
  block: BlubotBlock
}

export const BlubotNodeBody = ({ block: { options } }: Props) => {
  const { typebot } = useTypebot()

  return (
    <Stack w="full">
      <Text noOfLines={2} pr="6">
        Atendimento humano...
      </Text>
      {options.responseVariableMapping
        .filter((mapping) => mapping.variableId)
        .map((mapping) => (
          <SetVariableLabel
            key={mapping.variableId}
            variableId={mapping.variableId as string}
            variables={typebot?.variables}
          />
        ))}
    </Stack>
  )
}
