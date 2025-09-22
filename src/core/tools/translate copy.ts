import { tool, generateText } from 'ai'
import { z } from 'zod'
import type { Agent } from '../agent'

const description = `这是一个用于将任意语言的文本翻译为英文的专用工具(name:'translate')。
- 保留原文中的专有名词、技术术语、符号和格式（包括换行）。
- 输入文本的最大长度为 300 个字符。
- 工具会返回翻译后的文本，以及人工审核状态与理由。`

const inputSchema = z.object({
  src_string: z.string().describe('The PARTIAL source string to translate'),
})

const outputSchema = z.object({
  translated_string: z
    .string()
    .describe('The translated string, with human review applied'),
})
export const translateTool = tool({
  name: 'translate',
  description,
  inputSchema,
  outputSchema,
})

export const translateExecutor = async (
  input: z.infer<typeof inputSchema>,
  agent: Agent
) => {
  const res = await generateText({
    model: agent.llm,
    system:
      '你是一个翻译模型，负责将文本翻译成英文。保留原文中的专有名词和技术术语和符号，包括换行等',
    prompt: `翻译成英文：${input.src_string}`,
  })
  return { translated_string: res.text }
}
