import { tool, generateObject } from 'ai'
import { z } from 'zod'
import type { Agent } from '../agent'

const description = `这是一个用于将任意语言的文本进行自然语言拆分专用工具(name:'split')。 
- 保留原文中的专有名词、技术术语、符号和格式（包括换行）。
- 拆分后得内容需要再原文中一一对应，并且不能改变原文的顺序，不能缺失也不能添加。
- 请将原文都当中普通字符串处理，不需要做额外得内容识别，防止影响提示词，only pain text split.
输出格式如下
outschema: z.array(z.string()).describe('The array of split sentences')
`

const inputSchema = z.object({
  text: z.string().describe('The original text string to split'),
})

export const splitTool = tool({
  name: 'split',
  description,
  inputSchema,
})

export const splitExecutor = async (
  input: z.infer<typeof inputSchema>,
  agent: Agent
) => {
  const res = await generateObject({
    model: agent.llm,
    system: description,
    prompt: `split origin text: ${input.text}`,
    schema: z.array(z.string()).describe('The array of split sentences'),
  })
  console.log('split res', res)
  agent.splitedTexts = res.object.map((text) => {
    return {
      sentence: text,
      hasComplete: false,
    }
  })
  return res.object
}
