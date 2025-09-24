import { Context } from './context.js'
import { createModels } from './llm.js'
import {
  type LanguageModel,
  type UserModelMessage,
  type ToolCallPart,
  type ToolModelMessage,
  type ToolSet,
  generateText,
  streamText,
} from 'ai'
import { systemPrompt } from './prompt/system.js'
import { tools, toolsExecuter } from './tools'

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
  options: any = {}
  splitedTexts: { sentence: string; hasComplete: boolean }[] = []

  tools: ToolSet = {}
  toolsExecuter: Record<string, (...args: any[]) => any> = {}

  models: Record<'reasoning' | 'tool', LanguageModel> = createModels()
  context: Context = null!
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
  constructor(options: any) {
    this.options = options
    this.tools = tools
    this.toolsExecuter = toolsExecuter
    this.context = new Context()
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
  async userSubmit(message: UserModelMessage) {
    this.state = 'user_input'
    this.context.addMessage(message)

    // await this.requestLLM()
    await this.streamRequestLLM()
    this.state = 'idle'
  }

  async execToolCall(executer: () => Promise<any>, toolCall: ToolCallPart) {
    this.state = 'tool_executing'
    const taskResult = await executer()
    this.state = 'tool_result'
    console.log(taskResult)
    const toApproveMessage: ToolModelMessage = {
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
  }

  async requestLLM() {
    try {
      this.state = 'llm_response_pending'
      const res = await generateText({
        system: systemPrompt,
        model: this.models.reasoning,
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
  async streamRequestLLM() {
    try {
      this.state = 'llm_response_pending'
      const { fullStream, toolCalls, reasoning } = streamText({
        system: systemPrompt,
        model: this.models.reasoning,
        tools: this.tools,
        messages: this.context.toModelMessages(),
      })
      console.log('llm res', toolCalls, reasoning)
      let reasoningText = ''
      for await (const chunk of fullStream) {
        console.log('text', chunk)
        if (chunk.type === 'reasoning-delta') {
          reasoningText += chunk.text
          const last = this.context.getMessages().at(-1)
          if (last?.role === 'user') {
            this.context.addMessage({
              content: `<thinking>${reasoningText}</thinking>`,
              role: 'assistant',
            })
          } else {
            const messages = this.context.getMessages()
            this.context.setMessages([
              ...messages.slice(0, messages.length - 1),
              {
                content: `<thinking>${reasoningText}</thinking>`,
                role: 'assistant',
              },
            ])
          }
        } else if (chunk.type === 'tool-call') {
          this.context.addMessage({
            role: 'assistant',
            content: [chunk],
          })
          await this.processToolCall(chunk)
        }
      }
    } catch (error) {
      console.error(error)
      this.state = 'error'
    }
  }
  async processToolCall(toolCall: ToolCallPart) {
    const executer = this.toolsExecuter[toolCall.toolName]
    if (executer) {
      await this.execToolCall(() => executer(toolCall.input, this), toolCall)
      await this.requestLLM()
    }
  }

  hasComplete() {
    return this.splitedTexts.every((text) => text.hasComplete)
  }
}
