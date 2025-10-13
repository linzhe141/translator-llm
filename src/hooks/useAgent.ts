import { Agent } from '@/core/agent'
import { createRef, useEffect } from 'react'
import { useAgentStore } from '@/store/agent'

// TODO 这个单例有点抽象了
const _agent = createRef<Agent>() as React.RefObject<Agent>
export function useAgent() {
  const state = useAgentStore((s) => s.state)
  const setState = useAgentStore((s) => s.setState)

  const pendingResolveData = useAgentStore((s) => s.pendingResolveData)
  const setPendingResolveData = useAgentStore((s) => s.setPendingResolveData)

  const messageList = useAgentStore((s) => s.messageList)
  const setMessageList = useAgentStore((s) => s.setMessageList)

  const toolExecuteMetaInfo = useAgentStore((s) => s.toolExecuteMetaInfo)
  const setToolExecuteMetaInfo = useAgentStore((s) => s.setToolExecuteMetaInfo)

  if (_agent.current === null) {
    _agent.current = new Agent({
      setPendingResolveData,
      setState,
      setMessageList,
      setToolExecuteMetaInfo,
    })
  }

  useEffect(() => {
    let timer = null
    if (state === 'workflow_complete') {
      timer = setTimeout(() => {
        setState('idle')
      }, 2000)
    }
    return () => {
      if (timer) {
        clearTimeout(timer)
      }
    }
  }, [state, setState])
  return {
    agent: _agent,
    pendingResolveData,
    messageList,
    state,
    toolExecuteMetaInfo,
  }
}
