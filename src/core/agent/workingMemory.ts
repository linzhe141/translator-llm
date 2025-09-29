export interface TranslationResult {
  original: string
  translated: string
  approved: boolean
  rejectionCount: number
}

export interface WorkingMemory {
  originalText: string
  splitTexts: string[]
  currentTranslationIndex: number
  translationResults: TranslationResult[]
  isComplete: boolean
}

export function createInitialWorkingMemory(
  originalText?: string
): WorkingMemory {
  return {
    originalText: originalText || '',
    splitTexts: [],
    currentTranslationIndex: -1,
    translationResults: [],
    isComplete: false,
  }
}
