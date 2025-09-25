import { tool, generateObject } from 'ai'
import { z } from 'zod'
import type { Agent } from '../agent'

const description = `
This tool (name: 'split') finds natural-language segment boundaries in a text.

Rules:
- Do not rewrite, normalize, or remove any characters from the text.
- Only detect **segment boundaries** (typically at the end of a sentence or paragraph).
- Return an array of integers representing the **end index (exclusive)** of each segment.
- Indices must exactly correspond to positions in the original text (count every character, including spaces, tabs, line breaks, punctuation).
- Keep the same order as they appear in the original text.
- No classification or rewriting — just boundary indices.

Output must be JSON
Example:
Input: "This is a test. This is another test."
Output: {result: [11]}
`

const inputSchema = z.object({
  text: z.string().describe('The original text string to split'),
})

export const splitTool = tool({
  name: 'split',
  description,
  inputSchema,
})

function splitByIndices(text: string, indices: number[]): string[] {
  const segments: string[] = []
  let start = 0
  for (const end of indices) {
    segments.push(text.slice(start, end))
    start = end
  }
  // 如果最后还有剩余
  if (start < text.length) {
    segments.push(text.slice(start))
  }
  return segments
}

export const splitExecutor = async (
  input: z.infer<typeof inputSchema>,
  agent: Agent
) => {
  const res = await generateObject({
    model: agent.models.tool,
    system: description,
    prompt: `split:${input.text}`,
    schema: z.object({
      result: z
        .array(z.number())
        .describe('Array of end indices of each natural-language segment'),
    }),
  })

  console.log('split indices', res)
  const segments = splitByIndices(input.text, res.object.result)

  agent.workingMemory.splitTexts = segments
  return segments
}
