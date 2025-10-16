import { splitExecutor, splitTool } from './split'
import { translateExecutor, translateTool } from './translate'
import { TranslateToolMessage } from './renderer/translateToolMessage'

export const tools = {
  translate: translateTool,
  split: splitTool,
}

export const toolsExecuter = {
  translate: translateExecutor,
  split: splitExecutor,
}

export const toolsRenderer = {
  translate: TranslateToolMessage,
}
