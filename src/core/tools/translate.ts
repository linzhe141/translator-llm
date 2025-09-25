import { tool, generateText } from 'ai'
import { z } from 'zod'
import type { Agent } from '../agent'

const description = `
You are a translation tool named "translate".  
Your ONLY task: **translate non-code text from any language into English**.  

Rules (MUST FOLLOW STRICTLY):  
1. **Do NOT summarize, interpret, or expand.** Translation only.  
2. **Preserve ALL formatting exactly** — including:
   - Line breaks  
   - Empty lines  
   - Spaces and indentation  
   - Markdown or HTML structure  
   - Lists, tables, emojis, punctuation, and symbols  
3. **Do NOT translate code snippets** (inline code, fenced code blocks, programming syntax).  
   - Keep code exactly as it appears.  
   - Only translate surrounding comments, text, or documentation.  
4. **Do NOT change the order of text segments.**  
5. Output **only the translated text**, no commentary, no explanation.  
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
  const match = sentence.match(/^(\s*)(.*?)(\s*)$/s) // s 修饰符让 . 匹配换行
  const leading = match?.[1] ?? ''
  const coreText = match?.[2] ?? ''
  const trailing = match?.[3] ?? ''
  const translatedCore = await translateSentence(coreText, agent)
  let translated = leading + translatedCore + trailing
  const { status } = await agent.waitingToBeResolved({ sentence, translated })
  if (status === 'approved') {
    // mark complete
    agent.workingMemory.currentTranslationIndex++
    agent.workingMemory.translationResults.push({
      original: sentence,
      translated: translated,
      approved: true,
      rejectionCount: rejectedItems[sentence]?.length || 0,
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
