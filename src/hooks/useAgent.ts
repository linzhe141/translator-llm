import { Agent, type WorkflowState } from '@/core/agent'
import { useRef, useState, useSyncExternalStore } from 'react'

export function useAgent() {
  const [pendingResolveData, setPendingResolveData] = useState<any>(null)
  const [state, setState] = useState<WorkflowState>('idle')
  const agent = useRef(
    new Agent({
      setPendingResolveData,
      setState,
    })
  )
  const messageList = useSyncExternalStore(
    agent.current.context.subscribe.bind(agent.current.context),
    agent.current.context.getMessages.bind(agent.current.context)
  )
  return { agent, pendingResolveData, messageList, state }
}
