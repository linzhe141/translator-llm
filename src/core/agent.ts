import {
  Context,
  type AssistantMessageContext,
  type ReasoningAssistantContent,
  type ToolCallAssistantContent,
  type ToolMessage,
  type UserMessage,
} from './context/index.js'
import { createModels } from './llm.js'
import {
  type LanguageModel,
  type ToolCallPart,
  type ToolSet,
  // generateText,
  streamText,
} from 'ai'
import { systemPrompt } from './prompt/system.js'
import { tools, toolsExecuter } from './tools'
import { v4 as uuid } from 'uuid'
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

interface WorkingMemory {
  originalText: string
  splitTexts: string[]
  currentTranslationIndex: number
  translationResults: {
    original: string
    translated: string
    approved: boolean
    rejectionCount: number
  }[]
  isComplete: boolean
}
function createInitialWorkingMemory(originalText?: string): WorkingMemory {
  return {
    originalText: originalText || '',
    splitTexts: [],
    currentTranslationIndex: -1,
    translationResults: [],
    isComplete: false,
  }
}
export class Agent {
  // Agent 的工作记忆
  workingMemory: WorkingMemory = createInitialWorkingMemory()

  options: any = {}

  tools: ToolSet = tools
  toolsExecuter: Record<string, (...args: any[]) => any> = toolsExecuter

  models: Record<'reasoning' | 'tool', LanguageModel> = createModels()
  context: Context = new Context()

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
      type: 'llm',
      message: message,
    })
    this.workingMemory = createInitialWorkingMemory(message.content as string)
    // await this.requestLLM()
    await this.workloop()
  }
  async workloop() {
    while (!this.workingMemory.isComplete) {
      await this.streamRequestLLM()
      if (this.state === 'error') {
        break
      }
    }
    this.state = 'workflow_complete'
  }

  async execToolCall(executer: () => Promise<any>, toolCall: ToolCallPart) {
    this.state = 'tool_executing'
    const taskResult = await executer()
    this.state = 'tool_result'
    console.log(taskResult)
    const toApproveMessage: ToolMessage = {
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
    this.context.addMessage({
      id: uuid(),
      type: 'llm',
      message: toApproveMessage,
    })
  }

  async requestLLM() {
    // try {
    //   this.state = 'llm_response_pending'
    //   const res = await generateText({
    //     system: systemPrompt,
    //     model: this.models.reasoning,
    //     tools: this.tools,
    //     messages: this.context.toModelMessages(),
    //   })
    //   this.state = 'llm_response_received'
    //   console.log('llm res', res)
    //   const { toolCalls, reasoning, text } = res
    //   if (reasoning) {
    //     console.log('reasoning', reasoning)
    //   }
    //   if (text) {
    //     this.context.addMessage({ message: text, role: 'assistant' })
    //   }
    //   if (toolCalls.length) {
    //     //TODO tool call only one by one
    //     this.context.addMessage({
    //       role: 'assistant',
    //       message: toolCalls,
    //     })
    //     await this.processToolCall(toolCalls[0])
    //   }
    // } catch (error) {
    //   console.error(error)
    //   this.state = 'error'
    // }
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
      let toolCallInput = ''
      for await (const chunk of fullStream) {
        console.log('text', JSON.stringify(chunk, null, 2))
        if (chunk.type === 'reasoning-delta') {
          reasoningText += chunk.text
          const last = this.context.getMessages().at(-1)
          if (!last) {
            console.error('a internal error has occured')
            return
          }
          // 新增 reason message
          if (last.type === 'llm' && last.message.role === 'user') {
            const message: AssistantMessageContext<ReasoningAssistantContent> =
              {
                id: uuid(),
                type: 'llm',
                message: {
                  role: 'assistant',
                  content: {
                    type: 'reasoning',
                    text: reasoningText,
                  },
                },
              }
            this.context.addMessage(message)
          } else {
            // update
            const last = this.context.getMessages().at(-1)
            if (!last || !this.context.isReasoningMessage(last)) {
              console.error('a internal error has occured')
              return
            }
            this.context.updateStreamReasoningMessage(last, reasoningText)
          }
        } else if (chunk.type === 'tool-input-start') {
          // 工具调用开始
          const toolCallMessag: AssistantMessageContext<ToolCallAssistantContent> =
            {
              id: uuid(),
              type: 'llm',
              message: {
                role: 'assistant',
                content: [
                  {
                    type: 'tool-call',
                    toolCallId: chunk.id,
                    toolName: chunk.toolName,
                    input: '',
                  },
                ],
              },
            }
          this.context.addMessage(toolCallMessag)
        } else if (chunk.type === 'tool-input-delta') {
          // 工具调用参数流式更新
          const last = this.context.getMessages().at(-1)
          if (!last || !this.context.isToolCallMessage(last)) {
            console.error('a internal error has occured')
            return
          }
          toolCallInput += chunk.delta
          this.context.updateStreamToolCallMessage(last, toolCallInput)
        } else if (chunk.type === 'tool-call') {
          const toolCallMessag: AssistantMessageContext<ToolCallAssistantContent> =
            {
              id: uuid(),
              type: 'llm',
              message: {
                role: 'assistant',
                content: [chunk],
              },
            }
          this.context.updateLastMessage(toolCallMessag)
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
    if (!executer) return
    const toolName = toolCall.toolName
    if (toolName === 'translate') {
      for (const input of this.workingMemory.splitTexts) {
        await this.execToolCall(
          () => executer({ src_string: input }, this),
          toolCall
        )
      }
      this.workingMemory.isComplete = true
    } else {
      await this.execToolCall(() => executer(toolCall.input, this), toolCall)
    }
  }
}
