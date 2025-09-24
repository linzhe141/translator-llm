import { tool, generateText } from 'ai'
import { z } from 'zod'
import type { Agent } from '../agent'

const description = `
This tool (name: 'translate') translates text from any language into English only.

Rules:
- Do NOT summarize, interpret, or expand. Translation only.
- Preserve proper nouns, technical terms, symbols, and formatting (including line breaks) exactly as in the source.
- If the input contains code snippets (inline code, fenced code blocks, or any programming syntax),
  do NOT translate the code. Leave all code exactly as it appears.
- Translate only the non-code text.
- Output only the translated text, without any additional commentary or explanation.
`

const rejectedItems: Record<string, string[]> = {}
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
  const result = await auditTranslate(input.src_string, agent)
  return { translated_string: result }
}

async function translateSentence(sentence: string, agent: Agent) {
  const res = await generateText({
    model: agent.models.tool,
    system: `${description}
    ${
      Object.keys(rejectedItems).length > 0
        ? `
### This is <original-sentence>${sentence}</original-sentence> that had translation issues:
The following sentences were previously rejected by human reviewers
${rejectedItems[sentence].map((i) => `- <rejected-translated>${i}</rejected-translated>`).join('\n')}
Please avoid similar mistakes. `
        : ''
    }`,
    prompt: `translate this sentence: ${sentence}`,
  })
  return res.text
}

async function auditTranslate(sentence: string, agent: Agent) {
  let translated = await translateSentence(sentence, agent)
  const { status } = await agent.waitingToBeResolved({ sentence, translated })
  if (status === 'approved') {
    // mark complete
    agent.workingMemory.currentTranslationIndex++
    agent.workingMemory.translationResults.push({
      original: sentence,
      translated: translated,
      approved: true,
      rejectionCount: rejectedItems[sentence].length || 0,
    })
    delete rejectedItems[sentence]
  } else {
    if (rejectedItems[sentence]) {
      rejectedItems[sentence].push(translated)
    } else {
      rejectedItems[sentence] = [translated]
    }
    translated = await auditTranslate(sentence, agent)
  }
  return translated
}
