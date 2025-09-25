import { useSettingsStore } from '@/store/settings'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'

export function createModels() {
  const { apiKey, baseUrl, reasonModelID, toolModelID } =
    useSettingsStore.getState()

  const openai = createOpenAICompatible({
    name: 'openai-compatible',
    apiKey,
    baseURL: baseUrl,
  })
  const models = {
    reasoning: openai(reasonModelID),
    tool: openai(toolModelID),
  }
  return models
}
