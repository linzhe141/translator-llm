import { tool, generateText, type ToolCallPart } from 'ai'
import { z } from 'zod'
import type { Agent } from '../agent'
import { translateToolUIPlaceholder } from '@/common'

const description = `
You are a translation tool named "translate".  
Your ONLY task: **translate non-code text from any language into English**.  

Description:  
1. **Preserve ALL formatting exactly** — including:
   - Line breaks  
   - Empty lines  
   - Spaces and indentation  
   - Markdown or HTML structure  
   - Lists, tables, emojis, punctuation, and symbols  
2. **Do NOT translate code snippets** (inline code, fenced code blocks, programming syntax).  
   - Keep code exactly as it appears.  
   - Only translate surrounding comments, text, or documentation.  
3. **Do NOT change the order of text segments.**  
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
      translated: [
        // only a placeholder for ui
        {
          status: 'pending',
          text: translateToolUIPlaceholder,
        },
      ],
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
    const translateItem = target.translated[target.translated.length - 1]
    translateItem.text = translatedCore
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
      // only a placeholder for ui
      target.translated.push({
        status: 'pending',
        text: translateToolUIPlaceholder,
      })
      syncStoreDispatch(data)

      translated = await auditTranslate(split)
    }

    return translated
  }
  async function translateSentence(sentence: string) {
    const system = `${description}
    ${
      Object.keys(rejected).length > 0
        ? `
### This is <original-sentence>${sentence}</original-sentence> that had translation issues:
The following sentences were previously rejected by human reviewers
They were rejected for stylistic or wording reasons — not for accuracy.
You must produce a **different English rendering** that preserves meaning
but **uses different vocabulary or phrasing** from the rejected ones.

${rejected[sentence]
  .slice(-3)
  .map((i) => `- <rejected-translated>${i}</rejected-translated>`)
  .join('\n')}
`
        : ''
    }`
    const res = await generateText({
      model: agent.models.tool,
      system,
      prompt: `translate this sentence: ${sentence}`,
    })
    return res.text
  }

  return {
    content: response,
  }
}
