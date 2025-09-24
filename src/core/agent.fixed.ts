import { Context } from './context.js'
import { createModels } from './llm.js'
import {
  type LanguageModel,
  type UserModelMessage,
  generateText,
  generateObject,
} from 'ai'
import z from 'zod'

export class Agent {
  toolsExecuter: Record<string, (...args: any[]) => any> = {}

  llm: LanguageModel = null!
  context: Context = null!
  splitedTexts: { sentence: string; hasComplete: boolean }[] = []
  private _resolve:
    | ((value: { status: 'approved' | 'rejected' }) => void)
    | null = null
  constructor() {
    const models = createModels()
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
    this.context.addMessage(message)

    const { split } = await this.splitText(message.content as string)
    this.splitedTexts = split.map((i) => ({ sentence: i, hasComplete: false }))
    console.log('splitedTexts', this.splitedTexts)
    await this.processSplitedTexts()
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
}
