import { tool, generateObject } from 'ai'
import { z } from 'zod'
import type { Agent } from '../agent'

const description = `This tool (name: 'split') is designed to split text written in any language into natural-language segments.

- Preserve all proper nouns, technical terms, symbols, and formatting (including line breaks).
- The split output must exactly correspond to the original text: keep the same order, do not omit or add anything.
- Treat the original text purely as plain text strings; do not perform any extra classification or interpretation, to avoid affecting the prompt.
- Only perform plain text splitting.

Output must be this json format: z.array(z.string()).describe('The array of split sentences')
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
    model: agent.models.tool,
    system: description,
    prompt: `split origin text: ${input.text}`,
    schema: z.array(z.string()).describe('The array of split sentences'),
  })
  console.log('split res', res)
  agent.workingMemory.splitTexts = res.object
  return res.object
}
