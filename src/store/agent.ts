import type { WorkflowState } from '@/core/agent'
import type { ContextMessage } from '@/core/context'
import { create } from 'zustand'

type AgentStore = {
  messageList: ContextMessage[]
  setMessageList: (v: ContextMessage[]) => void

  state: WorkflowState
  setState: (v: WorkflowState) => void

  pendingResolveData: any
  setPendingResolveData: (v: any) => void

  toolExecuteMetaInfo: any
  setToolExecuteMetaInfo: (v: any) => void
}

export const useAgentStore = create<AgentStore>((set) => ({
  messageList: [],
  setMessageList: (v) => set({ messageList: v }),

  state: 'idle',
  setState: (v) => set({ state: v }),

  pendingResolveData: null,
  setPendingResolveData: (v) => set({ pendingResolveData: v }),

  toolExecuteMetaInfo: null,
  setToolExecuteMetaInfo: (v) => set({ toolExecuteMetaInfo: v }),
}))
