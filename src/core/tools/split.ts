import { tool, type ToolCallPart } from 'ai'
import { z } from 'zod'
import type { Agent } from '../agent'

const description = `
This tool (name: 'split') splits a text into natural-language segments using regular expressions.

Rules:
- Do not rewrite, normalize, or remove any characters from the text.
- Detect segment boundaries at the end of a sentence or paragraph.
- Return an array of integers representing the **end index (exclusive)** of each segment.
- Indices must exactly correspond to positions in the original text (count every character, including spaces, tabs, line breaks, punctuation).
- Keep the same order as they appear in the original text.
- No classification or rewriting — just boundary indices.

Example:
Input: "This is a test. This is another test."
Output: {result: ["This is a test. ", "This is another test."]}
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
  console.log('split indices', indices)
  const segments = splitByIndices(input.text, indices)
  agent.workingMemory.splitTexts = segments
  return segments
}
