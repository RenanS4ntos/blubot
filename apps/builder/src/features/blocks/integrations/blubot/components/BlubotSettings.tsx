import {
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionIcon,
  AccordionPanel,
  HStack,
  Select,
  Spinner,
  Stack,
  Text,
} from '@chakra-ui/react'
import React, { ChangeEvent, useEffect, useMemo, useState } from 'react'
import { api } from '../api/axios'
import {
  Blubot,
  BlubotOptions,
  ResponseVariableMapping,
} from '@typebot.io/schemas/features/blocks/integrations/blubot'
import { TextInput } from '@/components/inputs'
import { DropdownList } from '@/components/DropdownList'
import { HttpMethod } from '@typebot.io/schemas/features/blocks/integrations/webhook/enums'
import { TableList, TableListItemProps } from '@/components/TableList'
import { DataVariableInputs } from './ResponseMappingInputs'

interface Team {
  id: string
  description: string
}

interface Forwarding {
  id: string
  description: string
}

interface Attendants {
  id: string
  name: string
  teamId: string
}

type BlubotSettingsProps = {
  options: BlubotOptions
  onOptionsChange: (options: BlubotOptions) => void
}

export const BlubotSettings = ({
  options,
  onOptionsChange,
}: BlubotSettingsProps) => {
  const defaultURL = 'https://blubot-api.onrender.com/service'
  const blubot = options.blubot as Blubot
  const body = blubot.body
  const [responseKeys] = useState<string[]>(['data.protocol'])
  const [loading, setLoading] = useState(true)
  const [teams, setTeams] = useState<Team[]>([])
  const [forwardings, setForwardings] = useState<Forwarding[]>([])
  const [attendants, setAttendants] = useState<Attendants[]>([])
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null)
  const [selectedForwarding, setSelectedForwarding] =
    useState<Forwarding | null>(null)

  async function loadData() {
    if (options.blubot?.body) {
      const { teamId, forwardingId } = options.blubot.body
      setSelectedTeam(teamId)
      setSelectedForwarding({ description: '', id: forwardingId })
    }
    await api.get('/teams').then((response) => setTeams(response.data))
    await api
      .get('/forwardings')
      .then((response) => setForwardings(response.data))

    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    async function getAttendants() {
      await api
        .get(`/teams/${selectedTeam}/attendants`)
        .then((response) => setAttendants(response.data))
    }
    if (
      selectedTeam &&
      selectedForwarding &&
      selectedForwarding.description === 'Atendente especifico'
    ) {
      getAttendants()
    }
  }, [selectedForwarding, selectedTeam])

  function handleChangeTeam(event: ChangeEvent<HTMLSelectElement>) {
    const team = event.currentTarget.value
    body.teamId = team

    onOptionsChange({
      ...options,
      blubot: {
        ...blubot,
        body: {
          ...body,
          teamId: team,
        },
      },
    })

    setSelectedTeam(team)
  }

  function handleChangeForwarding(event: ChangeEvent<HTMLSelectElement>) {
    const forwarding = event.currentTarget.value
    const forwardingSelected = forwardings.find((f) => f.id === forwarding)

    if (forwardingSelected) {
      setSelectedForwarding(forwardingSelected)
      onOptionsChange({
        ...options,
        blubot: {
          ...blubot,
          body: {
            ...body,
            forwardingId: forwardingSelected.id,
          },
        },
      })
    }
  }

  function handleChangeAttendant(event: ChangeEvent<HTMLSelectElement>) {
    const attendant = event.currentTarget.value

    onOptionsChange({
      ...options,
      blubot: {
        ...blubot,
        body: {
          ...body,
          attendantId: attendant,
        },
      },
    })
  }

  const ResponseMappingInputs = useMemo(
    () =>
      function Component(props: TableListItemProps<ResponseVariableMapping>) {
        return <DataVariableInputs {...props} dataItems={responseKeys} />
      },
    [responseKeys]
  )

  const updateResponseVariableMapping = (
    responseVariableMapping: ResponseVariableMapping[]
  ) => onOptionsChange({ ...options, responseVariableMapping })

  const updateMethod = (method: HttpMethod) =>
    onOptionsChange({
      ...options,
      blubot: {
        ...blubot,
        method,
      },
    })

  if (loading) return <Spinner />

  return (
    <Stack spacing={4}>
      <TextInput
        placeholder="Paste Blubot URL..."
        defaultValue={defaultURL}
        isDisabled={true}
      />
      <HStack justify="space-between">
        <Text>Method:</Text>
        <DropdownList
          currentItem={HttpMethod.POST}
          onItemSelect={updateMethod}
          items={Object.values(HttpMethod)}
          isDisabled
        />
      </HStack>
      <Select
        isRequired
        placeholder={loading ? 'Carregando equipes...' : 'Equipe...'}
        variant={'filed'}
        onChange={handleChangeTeam}
        defaultValue={options.blubot?.body.teamId}
      >
        {teams.map((team) => {
          return (
            <option key={team.id} value={team.id}>
              {team.description}
            </option>
          )
        })}
      </Select>
      <Select
        isRequired
        placeholder={
          loading
            ? 'Carregando encaminhamentos...'
            : 'Tipo de encaminhamento...'
        }
        variant={'filed'}
        onChange={handleChangeForwarding}
        defaultValue={options.blubot?.body.forwardingId}
      >
        {forwardings.map((forwarding) => {
          return (
            <option key={forwarding.id} value={forwarding.id}>
              {forwarding.description}
            </option>
          )
        })}
      </Select>
      {selectedForwarding &&
        selectedForwarding.description === 'Atendente especifico' && (
          <Select
            isRequired
            placeholder="Atendente..."
            variant={'filed'}
            onChange={handleChangeAttendant}
            defaultValue={options.blubot?.body.attendantId}
          >
            {attendants.map((attendant) => {
              return (
                <option key={attendant.id} value={attendant.id}>
                  {attendant.name}
                </option>
              )
            })}
          </Select>
        )}

      <Accordion allowMultiple>
        <AccordionItem>
          <AccordionButton justifyContent="space-between">
            Save in variables
            <AccordionIcon />
          </AccordionButton>
          <AccordionPanel pt="4">
            <TableList<ResponseVariableMapping>
              initialItems={options.responseVariableMapping}
              onItemsChange={updateResponseVariableMapping}
              Item={ResponseMappingInputs}
              addLabel="Add an entry"
            />
          </AccordionPanel>
        </AccordionItem>
      </Accordion>
    </Stack>
  )
}
