import { Context } from './context.js'
import { createModels } from './llm.js'
import {
  type LanguageModel,
  type UserModelMessage,
  type ToolCallPart,
  type ToolModelMessage,
  generateText,
  type ToolSet,
} from 'ai'
import { systemPrompt } from './prompt/system.js'
import { translateExecutor, translateTool } from './tools/translate.js'
type WorkflowState = 'idle' | 'user_input' | 'model_response' | 'workflowing'
export class Agent {
  tools: ToolSet = {}
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  toolsExecuter: Record<string, Function> = {}

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
  userSubmit(message: UserModelMessage) {
    this.state = 'user_input'
    this.context.addMessage(message)
    this.requestLLM()
  }
  async auditTask(task: () => Promise<any>, toolCall: ToolCallPart) {
    const taskResult = await task()
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
    const res = await this.waitingToBeResolved()
    const { status } = res
    if (status === 'rejected') {
      // retry
      const messages = this.context.getMessages()
      this.context.setMessages([
        ...messages.slice(0, messages.length - 1),
        Object.assign({}, toApproveMessage, { status: 'rejected' }),
      ])
      await this.auditTask(task, toolCall)
    } else {
      const messages = this.context.getMessages()
      this.context.setMessages([
        ...messages.slice(0, messages.length - 1),
        Object.assign({}, toApproveMessage, { status: 'approved' }),
      ])
      return taskResult
    }
  }

  async requestLLM() {
    const res = await generateText({
      system: systemPrompt,
      model: this.llm,
      tools: this.tools,
      messages: this.context.toModelMessages(),
    })
    console.log('llm res', res)
    const { toolCalls, reasoning, text } = res
    if (text) {
      this.context.addMessage({ content: text, role: 'assistant' })
    }
    if (toolCalls.length) {
      this.context.addMessage({
        role: 'assistant',
        content: toolCalls,
      })
      this.processToolCall()
    }
  }
  async processToolCall() {
    const target = this.context.getMessages().find((message) => {
      return (
        message.role === 'assistant' &&
        Array.isArray(message.content) &&
        message.content[0].type === 'tool-call'
      )
    })
    if (target) {
      const toolCall = (target.content as Array<ToolCallPart>)[0]
      const executer = this.toolsExecuter[toolCall.toolName]
      if (executer) {
        await this.auditTask(() => executer(toolCall.input, this), toolCall)
        //
        this.requestLLM()
      }
    }
  }
}
