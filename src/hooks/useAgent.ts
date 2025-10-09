import { Agent } from '@/core/agent'
import { useRef } from 'react'
import { useAgentStore } from '@/store/agent'

export function useAgent() {
  const state = useAgentStore((s) => s.state)
  const setState = useAgentStore((s) => s.setState)

  const pendingResolveData = useAgentStore((s) => s.pendingResolveData)
  const setPendingResolveData = useAgentStore((s) => s.setPendingResolveData)

  const messageList = useAgentStore((s) => s.messageList)
  const setMessageList = useAgentStore((s) => s.setMessageList)

  const agent = useRef(
    new Agent({
      setPendingResolveData,
      setState,
      setMessageList,
    })
  )

  return { agent, pendingResolveData, messageList, state }
}
