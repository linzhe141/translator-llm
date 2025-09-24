import { createDeepSeek } from '@ai-sdk/deepseek'
import { useSettingsStore } from '@/store/settings'

export function createModels() {
  const { apiKey, baseUrl, reasonModelID, toolModelID } =
    useSettingsStore.getState()
  const deepseek = createDeepSeek({
    apiKey,
    baseURL: baseUrl,
  })
  const models = {
    reasoning: deepseek(reasonModelID),
    tool: deepseek(toolModelID),
  }
  return models
}
