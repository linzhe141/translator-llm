import { splitExecutor, splitTool } from './split'
import { translateExecutor, translateTool } from './translate'

export const tools = {
  translate: translateTool,
  split: splitTool,
}

export const toolsExecuter = {
  translate: translateExecutor,
  split: splitExecutor,
}
