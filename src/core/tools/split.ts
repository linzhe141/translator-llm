import { tool, type ToolCallPart } from 'ai'
import { z } from 'zod'
import type { Agent } from '../agent'

const description = `
This tool (name: 'split') splits a text into natural-language segments using regular expressions.

Example:
Input: "This is a test. This is another test."
Output: {splits: ["This is a test. ", "This is another test."]}
`

const inputSchema = z.object({
  text: z.string().describe('The original text string to split'),
})

export const splitTool = tool({
  name: 'split',
  description,
  inputSchema,
})

// 基于正则计算边界索引
function getBoundaryIndices(text: string): number[] {
  const indices: number[] = []
  // 匹配句子结束符号（中英文标点）后面可能有空格或换行
  const regex = /[。！？?!.](?=\s|$)/g
  let match
  while ((match = regex.exec(text)) !== null) {
    // match.index 是符号的起始位置，加符号长度才是结束位置
    indices.push(match.index + match[0].length)
  }
  return indices
}

function splitByIndices(text: string, indices: number[]): string[] {
  const segments: string[] = []
  let start = 0
  for (const end of indices) {
    segments.push(text.slice(start, end))
    start = end
  }
  if (start < text.length) {
    segments.push(text.slice(start))
  }
  return segments
}

export const splitExecutor = async (
  input: z.infer<typeof inputSchema>,
  agent: Agent,
  _toolCall: ToolCallPart
) => {
  const indices = getBoundaryIndices(input.text)
  const segments = splitByIndices(input.text, indices)
  console.log('split segments', segments)
  agent.workingMemory.splitTexts = segments
  return { splits: segments }
}
