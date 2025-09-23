import { Context } from './context.js'
import { createModels } from './llm.js'
import {
  type LanguageModel,
  type UserModelMessage,
  type ToolCallPart,
  type ToolModelMessage,
  type ToolSet,
  generateText,
} from 'ai'
import { systemPrompt } from './prompt/system.js'
import { translateExecutor, translateTool } from './tools/translate.js'

//TODO 当语句调用完成后，不需要发送到llm了，
export type WorkflowState =
  | 'idle'
  | 'user_input'
  //TODO 细分 reasoning | text only | tool call only | mixed
  | 'llm_response_pending'
  | 'llm_response_received'
  // TODO parallel 状态细分
  | 'tool_executing'
  | 'tool_result' // 会被 'tool_audit_pending' 覆盖 考虑不要？
  | 'tool_audit_pending'
  | 'tool_audit_approved'
  | 'tool_audit_rejected'
  | 'workflow_complete' // 等同于 idle 可以考虑不要这个状态？
  | 'error'
export class Agent {
  tools: ToolSet = {}
  toolsExecuter: Record<string, (...args: any[]) => any> = {}

  state: WorkflowState = 'idle'
  llm: LanguageModel = null!
  context: Context = null!
  private _resolve:
    | ((value: { status: 'approved' | 'rejected' }) => void)
    | null = null
  constructor() {
    const models = createModels()
    this.tools = {
      translate: translateTool,
    }
    this.toolsExecuter = {
      translate: translateExecutor,
    }
    this.llm = models.translator
    this.context = new Context()
  }

  waitingToBeResolved(): Promise<{ status: 'approved' | 'rejected' }> {
    return new Promise((reslove) => {
      this._resolve = reslove
    })
  }
  resolveTask() {
    this._resolve?.({ status: 'approved' })
  }
  rejectTask() {
    this._resolve?.({ status: 'rejected' })
  }
  async userSubmit(message: UserModelMessage) {
    this.state = 'user_input'
    this.context.addMessage(message)
    await this.requestLLM()
    this.state = 'idle'
  }
  async auditTask(task: () => Promise<any>, toolCall: ToolCallPart) {
    this.state = 'tool_executing'
    const taskResult = await task()
    this.state = 'tool_result'
    console.log(taskResult)
    const toApproveMessage: ToolModelMessage & {
      status: 'approved' | 'rejected' | 'idle'
    } = {
      status: 'idle',
      role: 'tool',
      content: [
        {
          type: 'tool-result',
          toolCallId: toolCall.toolCallId,
          toolName: toolCall.toolName,
          output: {
            type: 'json',
            value: taskResult,
          },
        },
      ],
    }
    this.context.addMessage(toApproveMessage)
    this.state = 'tool_audit_pending'
    const res = await this.waitingToBeResolved()
    const { status } = res
    if (status === 'rejected') {
      // retry
      this.state = 'tool_audit_rejected'
      const messages = this.context.getMessages()
      this.context.setMessages([
        ...messages.slice(0, messages.length - 1),
        Object.assign({}, toApproveMessage, { status: 'rejected' }),
      ])
      await this.auditTask(task, toolCall)
    } else {
      this.state = 'tool_audit_approved'
      const messages = this.context.getMessages()
      this.context.setMessages([
        ...messages.slice(0, messages.length - 1),
        Object.assign({}, toApproveMessage, { status: 'approved' }),
      ])
      return taskResult
    }
  }

  async requestLLM() {
    try {
      this.state = 'llm_response_pending'
      const res = await generateText({
        system: systemPrompt,
        model: this.llm,
        tools: this.tools,
        messages: this.context.toModelMessages(),
      })
      this.state = 'llm_response_received'
      console.log('llm res', res)
      const { toolCalls, reasoning, text } = res
      if (reasoning) {
        console.log('reasoning', reasoning)
      }
      if (text) {
        this.context.addMessage({ content: text, role: 'assistant' })
      }
      if (toolCalls.length) {
        //TODO tool call only one by one
        this.context.addMessage({
          role: 'assistant',
          content: toolCalls,
        })
        await this.processToolCall(toolCalls[0])
      }
    } catch (error) {
      console.error(error)
      this.state = 'error'
    }
  }
  async processToolCall(toolCall: ToolCallPart) {
    const executer = this.toolsExecuter[toolCall.toolName]
    if (executer) {
      await this.auditTask(() => executer(toolCall.input, this), toolCall)
      //
      await this.requestLLM()
    }
  }
}
