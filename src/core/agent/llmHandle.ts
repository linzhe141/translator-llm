import { streamText, type LanguageModel, type ToolSet } from 'ai'
import { type Agent } from '.'
import type {
  AssistantMessageContext,
  ReasoningAssistantContent,
  ToolCallAssistantContent,
} from '../context'
import { v4 as uuid } from 'uuid'
import { systemPrompt } from '../prompt/system'

export class LLMHandler {
  private agent: Agent = null!

  constructor(agent: Agent) {
    this.agent = agent
  }
  // 上下文会被 clear 所以每次需要获取最新的 context
  get context() {
    return this.agent.context
  }
  async streamAndHandle(model: LanguageModel, tools: ToolSet): Promise<any> {
    this.agent.state = 'llm_response_pending'
    const { fullStream } = streamText({
      system: systemPrompt,
      model,
      tools,
      messages: this.context.toModelMessages(),
    })

    let reasoningText = ''
    let toolCallInput = ''
    for await (const chunk of fullStream) {
      switch (chunk.type) {
        case 'error': {
          this.agent.state = 'error'
          throw chunk.error
        }
        case 'reasoning-delta': {
          reasoningText += chunk.text
          const last = this.context.getMessages().at(-1)
          if (!last) {
            console.error('internal error: no last message')
            return
          }
          if (last.type !== 'assistant') {
            const message: AssistantMessageContext<ReasoningAssistantContent> =
              {
                id: uuid(),
                type: 'assistant',
                message: {
                  role: 'assistant',
                  content: {
                    type: 'reasoning',
                    text: reasoningText,
                  },
                },
              }
            this.context.addMessage(message)
          } else {
            if (!this.context.isReasoningMessage(last)) {
              console.error('internal error: not reasoning message')
              return
            }
            this.context.updateStreamReasoningMessage(last, reasoningText)
          }
          break
        }
        case 'tool-input-start': {
          const toolCallMessag: AssistantMessageContext<ToolCallAssistantContent> =
            {
              id: uuid(),
              type: 'assistant',
              message: {
                role: 'assistant',
                content: [
                  {
                    type: 'tool-call',
                    toolCallId: chunk.id,
                    toolName: chunk.toolName,
                    input: '',
                  },
                ],
              },
            }
          this.context.addMessage(toolCallMessag)
          break
        }
        case 'tool-input-delta': {
          const last = this.context.getMessages().at(-1)
          if (!last || !this.context.isToolCallMessage(last)) {
            console.error('internal error: not tool call message')
            return
          }
          toolCallInput += chunk.delta
          this.context.updateStreamToolCallMessage(last, toolCallInput)
          break
        }
        case 'tool-call': {
          const toolCallMessag: AssistantMessageContext<ToolCallAssistantContent> =
            {
              id: uuid(),
              type: 'assistant',
              message: {
                role: 'assistant',
                content: [chunk],
              },
            }
          this.context.updateLastMessage(toolCallMessag)
          await this.agent.processToolCall(chunk)
          break
        }
        case 'finish-step': {
          console.log(chunk)
          return chunk.finishReason
        }
      }
    }
  }
}
