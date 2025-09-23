import { Context } from './context.js'
import { createModels } from './llm.js'
import {
  type LanguageModel,
  type UserModelMessage,
  type ToolCallPart,
  type ToolModelMessage,
  type ToolSet,
  generateText,
  generateObject,
} from 'ai'
import { systemPrompt } from './prompt/system.js'
import { translateExecutor, translateTool } from './tools/translate.js'
import z from 'zod'

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
  splitedTexts: { sentence: string; hasComplete: boolean }[] = []
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

    const { split } = await this.splitText(message.content as string)
    this.splitedTexts = split.map((i) => ({ sentence: i, hasComplete: false }))
    console.log('splitedTexts', this.splitedTexts)
    // await this.requestLLM()
    await this.processSplitedTexts()
    this.state = 'idle'
  }
  async processSplitedTexts() {
    for (const item of this.splitedTexts) {
      const { sentence, hasComplete } = item
      if (!hasComplete) {
        await this.auditTranslate(sentence)
        item.hasComplete = true
      }
    }
    console.log('all sentence complete')
  }
  async auditTranslate(sentence: string) {
    const { translated_string } = await this.translateSentence(sentence)
    console.log('translated_string', translated_string)
    // TODO
    const res = await this.waitingToBeResolved()
    if (res.status === 'approved') {
      // mark complete
    } else {
      //retry
      await this.auditTranslate(sentence)
    }
  }

  async splitText(originText: string) {
    const description = `这是一个用于将任意语言的文本进行自然语言拆分专用工具(name:'split')。 
    - 保留原文中的专有名词、技术术语、符号和格式（包括换行）。

    输出格式如下
    outschema: z.object({
      split: z.array(z.string()).describe('The array of split sentences'),
    })
    `
    const res = await generateObject({
      model: this.llm,
      system: `You are a helpful assistant designed to output JSON.`,
      prompt: `${description}
    split origin text:${originText}`,
      schema: z.object({
        split: z.array(z.string()).describe('The array of split sentences'),
      }),
    })
    return res.object
  }
  async translateSentence(sentence: string) {
    const res = await generateText({
      model: this.llm,
      system:
        '你是一个翻译模型，负责将文本翻译成英文。保留原文中的专有名词和技术术语和符号，包括换行等',
      prompt: `翻译成英文：${sentence}`,
    })
    return { translated_string: res.text }
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
        toolChoice: {
          type: 'tool',
          toolName: 'translate',
        },
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
