import { createDeepSeek } from '@ai-sdk/deepseek'
import { useSettingsStore } from '@/store/settings'

export function createModels() {
  const { apiKey, baseUrl, endPoint } = useSettingsStore.getState()
  const deepseek = createDeepSeek({
    apiKey,
    baseURL: baseUrl,
  })
  const models = {
    translator: deepseek(endPoint),
    memory: deepseek(endPoint),
  }
  return models
}
