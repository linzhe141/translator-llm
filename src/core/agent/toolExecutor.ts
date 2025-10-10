import type { ToolCallPart } from 'ai'
import { type Agent } from '.'
import type { ContextMessage, ToolMessage } from '../context'
import { v4 as uuid } from 'uuid'

export class ToolExecutor {
  private agent: Agent = null!
  private toolsExecuter: Record<string, (...args: any[]) => any> = null!
  constructor(agent: Agent) {
    this.agent = agent
    this.toolsExecuter = agent.toolsExecuter
  }
  // 上下文会被 clear 所以每次需要获取最新的 context
  get context() {
    return this.agent.context
  }
  async execute(toolCall: ToolCallPart) {
    const executer = this.toolsExecuter[toolCall.toolName]
    if (!executer) return
    let taskResult = ''

    const toApproveMessage: ToolMessage = {
      role: 'tool',
      content: [
        {
          type: 'tool-result',
          toolCallId: toolCall.toolCallId,
          toolName: toolCall.toolName,
          renderer: this.agent.toolsRenderer[toolCall.toolName],
          output: {
            type: 'json',
            value: taskResult,
          },
        },
      ],
    }
    const contextMsg: ContextMessage = {
      id: uuid(),
      type: 'tool',
      status: 'pending',
      message: toApproveMessage,
    }
    this.context.addMessage(contextMsg)
    this.agent.state = 'tool_executing'
    taskResult = await executer(toolCall.input, this.agent, toolCall)
    contextMsg.status = 'approved'
    contextMsg.message.content[0].output.value = taskResult
    this.context.updateLastMessage(Object.assign({}, contextMsg))
    this.agent.state = 'tool_result'
  }
}
