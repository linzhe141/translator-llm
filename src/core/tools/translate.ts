import { tool, generateText } from 'ai'
import { z } from 'zod'
import type { Agent } from '../agent'

const description = ` Translates text from any language to English. This tool preserves proper nouns, technical terms, symbols, and formatting (including line breaks) from the original text. Maximum input length is 300 characters. Returns the translated text along with a human review status and reasoning.`

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
