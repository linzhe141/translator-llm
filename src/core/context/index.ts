import {
  type AssistantModelMessage,
  type ModelMessage,
  type SystemModelMessage,
  type ToolModelMessage,
  type UserModelMessage,
} from 'ai'
interface IContext {
  id: string
}
interface ILLMContext extends IContext {
  type: 'llm'
}
export interface StreamContext extends IContext {
  type: 'stream-chunk'
  message: {
    type: 'tool-call'
    toolCallId: string
    toolName: string
    // 不完整的json字符串，动态拼接，当拼接完成后，删除这个message
    input: string
  }
}
export type UserMessage = Omit<UserModelMessage, 'content'> & {
  content: string
}

export type TextAssistantContent = string
export type ReasoningAssistantContent = { type: 'reasoning'; text: string }
export type ToolCallAssistantContent = {
  type: 'tool-call'
  toolCallId: string
  toolName: string
  input: unknown
}[]
export type AssistantContent =
  | TextAssistantContent
  | ReasoningAssistantContent
  | ToolCallAssistantContent

export type AssistantMessage<T extends AssistantContent = AssistantContent> =
  Omit<AssistantModelMessage, 'content'> & {
    content: T
  }

export type SystemMessage = SystemModelMessage
export type ToolMessage = ToolModelMessage
// export interface LLMContext extends IContext {
//   type: 'llm'
//   content: SystemMessage | UserMessage | AssistantMessage | ToolMessage
// }
export interface SystemMessageContext extends ILLMContext {
  message: SystemMessage
}

export interface UserMessageContext extends ILLMContext {
  message: UserMessage
}

export interface ToolMessageContext extends ILLMContext {
  message: ToolMessage
}

export interface AssistantMessageContext<
  T extends AssistantContent = AssistantContent,
> extends ILLMContext {
  message: AssistantMessage<T>
}
type LLMContext =
  | SystemMessageContext
  | UserMessageContext
  | ToolMessageContext
  | AssistantMessageContext
type ContextMessage = LLMContext /* | StreamContext */
export class Context {
  subscribers = new Set<any>()
  private messages: ContextMessage[] = []
  subscribe(callback: any) {
    this.subscribers.add(callback)
    return () => this.subscribers.delete(callback)
  }
  addMessage(message: ContextMessage) {
    this.setMessages([...this.messages, message])
  }
  setMessages(messages: ContextMessage[]) {
    this.messages = messages
    this.subscribers.forEach((callback) => {
      callback()
    })
  }
  deleteMessage(id: string) {
    this.setMessages(this.messages.filter((m) => m.id !== id))
  }

  getMessages(): ContextMessage[] {
    return this.messages
  }

  toModelMessages(): ModelMessage[] {
    const filterMessages = this.messages
      .filter((i) => {
        return i.type === 'llm'
      })
      .map((i) => i.message)
    const messages: ModelMessage[] = []
    for (const msg of filterMessages) {
      switch (msg.role) {
        case 'system': {
          const systemMsg = msg as SystemModelMessage
          messages.push(systemMsg)
          break
        }
        case 'user': {
          const userItem = msg as UserModelMessage
          messages.push(userItem)
          break
        }
        case 'assistant': {
          const assistantItem = msg
          if (typeof assistantItem.content === 'string') {
            messages.push(assistantItem as AssistantModelMessage)
          } else if (
            Array.isArray(assistantItem.content) &&
            assistantItem.content.length &&
            assistantItem.content[0].type === 'tool-call'
          ) {
            messages.push(assistantItem as AssistantModelMessage)
          }

          break
        }
        case 'tool': {
          const toolItem = msg as ToolModelMessage
          messages.push(toolItem)
          break
        }
      }
    }
    return messages
  }

  isReasoningMessage(message: ContextMessage): boolean {
    if (
      message.type === 'llm' &&
      message.message.role === 'assistant' &&
      !Array.isArray(message.message.content) &&
      typeof message.message.content === 'object' &&
      message.message.content.type === 'reasoning'
    ) {
      return true
    }
    return false
  }
  updateStreamReasoningMessage(reasonMessage: ContextMessage, content: string) {
    if (!this.isReasoningMessage(reasonMessage)) {
      throw new Error('a internal error has occured')
    } else {
      // 是否有react 引用问题？
      const ctxMessage =
        reasonMessage as AssistantMessageContext<ReasoningAssistantContent>
      ctxMessage.message.content.text = content
      this.setMessages(this.getMessages().slice())
    }
  }

  isToolCallMessage(message: ContextMessage): boolean {
    if (
      message.type === 'llm' &&
      message.message.role === 'assistant' &&
      Array.isArray(message.message.content) &&
      message.message.content.length &&
      message.message.content[0].type === 'tool-call'
    ) {
      return true
    }
    return false
  }

  updateStreamToolCallMessage(
    toolCallMessage: ContextMessage,
    content: string
  ) {
    if (!this.isToolCallMessage(toolCallMessage)) {
      throw new Error('a internal error has occured')
    } else {
      // 是否有react 引用问题？只考虑 one by one tool call
      const ctxMessage =
        toolCallMessage as AssistantMessageContext<ToolCallAssistantContent>
      ctxMessage.message.content[0].input = content
      this.setMessages(this.getMessages().slice())
    }
  }

  updateLastMessage(newLastMessage: ContextMessage) {
    const messages = this.getMessages()
    this.setMessages([
      ...messages.slice(0, messages.length - 1),
      newLastMessage,
    ])
  }
}
