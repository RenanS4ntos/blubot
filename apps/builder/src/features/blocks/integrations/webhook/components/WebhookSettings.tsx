import React, { ChangeEvent, useEffect, useMemo, useState } from 'react'
import { Select, Spinner, Stack } from '@chakra-ui/react'
import { WebhookOptions, Webhook, WebhookBlock } from '@typebot.io/schemas'
import { TextInput } from '@/components/inputs'
import { WebhookAdvancedConfigForm } from './WebhookAdvancedConfigForm'
import { api } from '../../blubot/api/axios'

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

type Props = {
  block: WebhookBlock
  onOptionsChange: (options: WebhookOptions) => void
}

export const WebhookSettings = ({
  block: { id: blockId, options },
  onOptionsChange,
}: Props) => {
  const defaultURL = 'https://blubot-api.onrender.com/service'
  const setLocalWebhook = async (newLocalWebhook: Webhook) => {
    newLocalWebhook.url = defaultURL

    onOptionsChange({ ...options, webhook: newLocalWebhook })
    return
  }
  const [loading, setLoading] = useState(true)
  const [teams, setTeams] = useState<Team[]>([])
  const [forwardings, setForwardings] = useState<Forwarding[]>([])
  const [attendants, setAttendants] = useState<Attendants[]>([])
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null)
  const [selectedForwarding, setSelectedForwarding] =
    useState<Forwarding | null>(null)
  const [selectedAttendant, setSelectedAttendant] = useState<string | null>(
    null
  )

  const body = useMemo(() => {
    if (!selectedAttendant) {
      return {
        teamId: selectedTeam ? selectedTeam : '',
        forwardingId: selectedForwarding ? selectedForwarding.id : '',
      }
    }
    return {
      teamId: selectedTeam ? selectedTeam : '',
      forwardingId: selectedForwarding ? selectedForwarding.id : '',
      attendantId: selectedAttendant,
    }
  }, [selectedAttendant, selectedForwarding, selectedTeam])

  async function loadData() {
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

    setSelectedTeam(team)
  }

  function handleChangeForwarding(event: ChangeEvent<HTMLSelectElement>) {
    const forwarding = event.currentTarget.value
    const forwardingSelected = forwardings.find((f) => f.id === forwarding)

    if (forwardingSelected) {
      setSelectedForwarding(forwardingSelected)
    }
  }

  function handleChangeAttendant(event: ChangeEvent<HTMLSelectElement>) {
    const attendant = event.currentTarget.value
    setSelectedAttendant(attendant)
  }

  if (loading) return <Spinner />

  return (
    <Stack spacing={4}>
      <TextInput
        placeholder="Paste webhook URL..."
        defaultValue={defaultURL}
        isDisabled={true}
      />
      <Select
        isRequired
        placeholder={loading ? 'Carregando equipes...' : 'Equipe...'}
        variant={'filed'}
        onChange={handleChangeTeam}
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
      <WebhookAdvancedConfigForm
        blockId={blockId}
        webhook={options.webhook as Webhook}
        options={options}
        onWebhookChange={setLocalWebhook}
        onOptionsChange={onOptionsChange}
        body={JSON.stringify(body)}
      />
    </Stack>
  )
}
