import { tool, generateText, type ToolCallPart } from 'ai'
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

const inputSchema = z.object({
  splits: z.array(
    z.string().describe('The PARTIAL source string to translate')
  ),
})

export const translateTool = tool({
  name: 'translate',
  description,
  inputSchema,
})

export interface TranslateToolResultMeta {
  status: 'approved' | 'rejected'
  original: string
  translated: string
  rejectionCount?: number
}
export const translateExecutor = async (
  input: z.infer<typeof inputSchema>,
  agent: Agent,
  _toolCall: ToolCallPart
) => {
  const meta: TranslateToolResultMeta[] = []
  let rejected: Record<string, string[]> = null!
  const response: string[] = []
  let leading = ''
  let coreText = ''
  let trailing = ''
  for (const split of input.splits) {
    rejected = {}
    const match = split.match(/^(\s*)(.*?)(\s*)$/s) // s 修饰符让 . 匹配换行
    leading = match?.[1] ?? ''
    coreText = match?.[2] ?? ''
    trailing = match?.[3] ?? ''
    const result = await auditTranslate(coreText)
    response.push(result)
  }
  agent.workingMemory.isComplete = true

  return {
    content: response,
    meta,
  }
  async function auditTranslate(sentence: string) {
    const translatedCore = await translateSentence(sentence)
    let translated = leading + translatedCore + trailing
    const original = leading + sentence + trailing
    const { status } = await agent.waitingToBeResolved({
      sentence,
      translated,
      meta,
    })
    if (status === 'approved') {
      // mark complete
      agent.workingMemory.currentTranslationIndex++
      agent.workingMemory.translationResults.push({
        original,
        translated,
        approved: true,
        rejectionCount: rejected[sentence]?.length || 0,
      })
      meta.push({
        status: 'approved',
        original,
        translated,
      })
    } else {
      if (rejected[sentence]) {
        rejected[sentence].push(translated)
      } else {
        rejected[sentence] = [translated]
      }

      meta.push({
        status: 'rejected',
        original,
        translated,
        rejectionCount: rejected[sentence]?.length || 0,
      })
      translated = await auditTranslate(sentence)
    }

    return translated
  }
  async function translateSentence(sentence: string) {
    const res = await generateText({
      model: agent.models.tool,
      system: `${description}
    ${
      Object.keys(rejected).length > 0
        ? `
### This is <original-sentence>${sentence}</original-sentence> that had translation issues:
The following sentences were previously rejected by human reviewers
${rejected[sentence].map((i) => `- <rejected-translated>${i}</rejected-translated>`).join('\n')}
Please avoid similar mistakes. `
        : ''
    }`,
      prompt: `translate this sentence: ${sentence}`,
    })
    return res.text
  }
}
