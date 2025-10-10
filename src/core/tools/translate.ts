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
type Status = 'approved' | 'rejected' | 'pending'
export interface TranslateToolResultMeta {
  status: Status
  original: string
  translated: { status: Status; text: string }[]
}

export const translateExecutor = async (
  input: z.infer<typeof inputSchema>,
  agent: Agent,
  toolCall: ToolCallPart
) => {
  function syncStoreDispatch(data: any) {
    const clone = JSON.parse(JSON.stringify(data))
    const setToolExecuteMetaInfo = agent.options.setToolExecuteMetaInfo
    if (setToolExecuteMetaInfo) {
      setToolExecuteMetaInfo(clone)
    }
  }

  const meta: TranslateToolResultMeta[] = []
  let rejected: Record<string, string[]> = null!
  const response: string[] = []
  const splitInfo: {
    sentence: string
    leading: string
    trailing: string
  }[] = []

  for (const split of input.splits) {
    const match = split.match(/^(\s*)(.*?)(\s*)$/s) // s 修饰符让 . 匹配换行
    const leading = match?.[1] ?? ''
    const sentence = match?.[2] ?? ''
    const trailing = match?.[3] ?? ''
    splitInfo.push({ leading, sentence, trailing })
  }
  const data = {
    toolName: toolCall.toolName,
    toolCallId: toolCall.toolCallId,
    data: meta,
  }
  for (const split of splitInfo) {
    rejected = {}
    meta.push({
      status: 'pending',
      original: split.sentence,
      translated: [],
    })
    syncStoreDispatch(data)
    const result = await auditTranslate(split)
    response.push(result)
  }
  agent.workingMemory.isComplete = true

  async function auditTranslate(split: {
    sentence: string
    leading: string
    trailing: string
  }) {
    const { sentence, leading, trailing } = split
    const translatedCore = await translateSentence(sentence)
    let translated = leading + translatedCore + trailing
    const original = leading + sentence + trailing

    const target = meta[agent.workingMemory.currentTranslationIndex + 1]
    const translateItem: TranslateToolResultMeta['translated'][number] = {
      status: 'pending',
      text: translatedCore,
    }
    target.translated.push(translateItem)
    syncStoreDispatch(data)

    const { status } = await agent.waitingToBeResolved()
    if (status === 'approved') {
      // mark complete
      agent.workingMemory.currentTranslationIndex++
      agent.workingMemory.translationResults.push({
        original,
        translated,
        approved: true,
        rejectionCount: rejected[sentence]?.length || 0,
      })

      const target = meta[agent.workingMemory.currentTranslationIndex]
      translateItem.status = 'approved'
      target.status = 'approved'
      syncStoreDispatch(data)
    } else {
      if (rejected[sentence]) {
        rejected[sentence].push(translatedCore)
      } else {
        rejected[sentence] = [translatedCore]
      }

      translateItem.status = 'rejected'
      syncStoreDispatch(data)

      translated = await auditTranslate(split)
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

  return {
    content: response,
  }
}
