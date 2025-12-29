import { tool, generateText, type ToolCallPart } from 'ai'
import { z } from 'zod'
import type { Agent } from '../agent'
import { translateToolUIPlaceholder } from '@/common'

const getDescription = (targetLanguage: string) => `
You are a deterministic translation engine named "translate".

Your task is NOT free-form translation.
Your task is a **lossless text transformation**:
translate human language content into ${targetLanguage}
while preserving the original text structure EXACTLY.

This is a strict contract.

====================
CRITICAL RULES
====================

1. You MUST preserve the input text byte-for-byte, EXCEPT for the translated human language.
   This includes but is not limited to:
   - All spaces (leading, trailing, and internal)
   - All line breaks and empty lines
   - All punctuation, symbols, and emojis
   - Markdown syntax, HTML tags, list markers, table separators
   - Indentation and alignment

2. You MUST NOT:
   - Add any new characters
   - Remove any characters
   - Normalize punctuation (e.g. ":" vs "：" or quotes)
   - Merge or split lines
   - Reorder text segments

3. Code is sacred.
   - Do NOT translate inline code
   - Do NOT translate fenced code blocks
   - Do NOT modify code formatting in any way
   - Only translate natural language outside code

4. Output ONLY the translated text.
   - No explanations
   - No comments
   - No tags
   - No wrappers

5. This output will be programmatically compared against the original.
   ANY formatting deviation is considered a FAILURE.

You may view the full original document as read-only context
to understand meaning, but you must ONLY translate the provided segment.
`

const inputSchema = z.object({
  targetLanguage: z
    .string()
    .describe('The target language to be translated')
    .default('english'),
  fullText: z.string().describe('The full original markdown text string'),
  splits: z.array(
    z.string().describe('The PARTIAL source string to translate')
  ),
})

export const translateTool = tool({
  name: 'translate',
  description: getDescription('target language'),
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
  const targetLanguage = input.targetLanguage
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
    splits: splitInfo,
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

    const auditResult = await agent.waitingToBeResolved()

    if (auditResult.status === 'approved') {
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
      const rejuectReason = auditResult.rejectReason
      if (rejected[sentence]) {
        rejected[sentence].push(
          translatedCore + (rejuectReason ? ` (Reason: ${rejuectReason})` : '')
        )
      } else {
        rejected[sentence] = [
          translatedCore + (rejuectReason ? ` (Reason: ${rejuectReason})` : ''),
        ]
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
    const system = getDescription(targetLanguage)
    const res = await generateText({
      model: agent.models.tool,
      system,
      prompt: `
Translate the following text into ${targetLanguage}.

STRICT REQUIREMENTS:
- Preserve all symbols, punctuation, spacing, and line breaks exactly.
- Translate ONLY human language.
- Do NOT add or remove any characters.

TEXT TO TRANSLATE:
${sentence}

REFERENCE CONTEXT (read-only):
${input.fullText}

REJECTIONS: Do NOT repeat these translations.
${(rejected[sentence] || []).map((i) => `- ${i}`).join('\n')}
`,
      abortSignal: agent.abortController!.signal,
    })
    return res.text
  }

  return {
    content: response,
    status: 'translation completed',
  }
}
