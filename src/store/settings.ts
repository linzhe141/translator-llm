import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

type State = {
  apiKey: string
  baseUrl: string
  modelID: string
}

type Actions = {
  setLLMApi: (data: {
    apiKey: string
    baseUrl: string
    modelID: string
  }) => void
}

export const useSettingsStore = create<State & Actions>()(
  persist(
    (set): State & Actions => ({
      apiKey: '',
      baseUrl: '',
      modelID: '',
      setLLMApi: (data) => {
        console.log('setLLMApi', data)
        set({ ...data })
      },
    }),
    {
      name: 'setting-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
