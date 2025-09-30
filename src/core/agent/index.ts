import { Context, type UserMessage } from '../context/index.js'
import { createModels } from '../llm.js'
import { type LanguageModel, type ToolCallPart, type ToolSet } from 'ai'
import { tools, toolsExecuter, toolsRenderer } from '../tools'
import { v4 as uuid } from 'uuid'
import {
  createInitialWorkingMemory,
  type WorkingMemory,
} from './workingMemory.js'
import { ToolExecutor } from './toolExecutor.js'
import { LLMHandler } from './llmHandle.js'
import type { ComponentType } from 'react'

export type WorkflowState =
  | 'idle'
  | 'user_input'
  | 'llm_response_pending'
  | 'llm_response_received'
  | 'tool_executing'
  | 'tool_result'
  | 'tool_audit_pending'
  | 'tool_audit_approved'
  | 'tool_audit_rejected'
  | 'workflow_complete'
  | 'error'

export class Agent {
  options: any = {}
  models: Record<'reasoning' | 'tool', LanguageModel> = createModels()

  tools: ToolSet = tools
  toolsExecuter: Record<
    string,
    (input: any, agent: Agent, toolCall: ToolCallPart) => any
  > = toolsExecuter
  toolsRenderer: Record<string, ComponentType> = toolsRenderer
  context: Context = new Context()
  workingMemory: WorkingMemory = createInitialWorkingMemory()

  private _resolve:
    | ((value: { status: 'approved' | 'rejected' }) => void)
    | null = null

  private _state: WorkflowState = 'idle'
  get state() {
    return this._state
  }
  set state(value: WorkflowState) {
    this.options.setState(value)
    this._state = value
  }

  private llmHandler = new LLMHandler(this)
  private toolExecutor = new ToolExecutor(this)

  constructor(options: any) {
    this.options = options
  }

  clear() {
    this.context = new Context()
    this.workingMemory = createInitialWorkingMemory()
  }

  waitingToBeResolved(data: any): Promise<{ status: 'approved' | 'rejected' }> {
    this.options.setPendingResolveData(data)
    return new Promise<{ status: 'approved' | 'rejected' }>((resolve) => {
      this._resolve = resolve
    }).finally(() => {
      this.options.setPendingResolveData(null)
    })
  }

  resolveTask() {
    this._resolve?.({ status: 'approved' })
  }
  rejectTask() {
    this._resolve?.({ status: 'rejected' })
  }

  async userSubmit(message: UserMessage) {
    this.state = 'user_input'
    this.context.addMessage({
      id: uuid(),
      type: 'user',
      message: message,
    })
    this.workingMemory = createInitialWorkingMemory(message.content as string)
    await this.workloop()
  }

  private async workloop() {
    while (!this.workingMemory.isComplete) {
      await this.streamRequestLLM()
      if (this.state === 'error') break
    }
    this.state = 'workflow_complete'
  }

  async streamRequestLLM() {
    try {
      await this.llmHandler.streamAndHandle(this.models.reasoning, this.tools)
    } catch (error) {
      console.error(error)
      this.state = 'error'
    }
  }

  async processToolCall(toolCall: ToolCallPart) {
    await this.toolExecutor.execute(toolCall)
  }
}
