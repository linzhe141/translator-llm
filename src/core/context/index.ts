import {
  type AssistantModelMessage,
  type ModelMessage,
  type SystemModelMessage,
  type ToolModelMessage,
  type ToolResultPart,
  type UserModelMessage,
} from 'ai'
import { isObject } from '@/utils'
import type { ComponentType } from 'react'

interface IContext {
  id: string
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
export type ToolMessage<P = any> = Omit<ToolModelMessage, 'content'> & {
  content: Array<ToolResultPart & { renderer?: ComponentType<P> }>
}
// export interface LLMContext extends IContext {
//   type: 'llm'
//   content: SystemMessage | UserMessage | AssistantMessage | ToolMessage
// }
export interface SystemMessageContext extends IContext {
  type: 'system'
  message: SystemMessage
}

export interface UserMessageContext extends IContext {
  type: 'user'
  message: UserMessage
}

export interface ToolMessageContext extends IContext {
  type: 'tool'
  status: 'pending' | 'approved' | 'rejected'
  message: ToolMessage
  meta?: any
}

export interface AssistantMessageContext<
  T extends AssistantContent = AssistantContent,
> extends IContext {
  type: 'assistant'
  message: AssistantMessage<T>
}
export type LLMContext =
  | SystemMessageContext
  | UserMessageContext
  | ToolMessageContext
  | AssistantMessageContext
export type ContextMessage = LLMContext /* | StreamContext */
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
        if (i.type === 'assistant') return i
        else if (i.type === 'system') return i
        else if (i.type === 'user') return i
        else if (i.type === 'tool' && i.status === 'approved') return i
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
          messages.push({
            ...toolItem,
            content: toolItem.content.map((i) => {
              if (isObject(i.output.value)) {
                // @ts-expect-error 不需要把 一些tool-result得运行时数据发送到LLM
                const { meta: _meta, ...rest } = i.output.value
                i.output.value = { ...rest }
              }
              return i
            }),
          })
          break
        }
      }
    }
    return messages
  }

  isReasoningMessage(message: ContextMessage): boolean {
    if (
      message.type === 'assistant' &&
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
      message.type === 'assistant' &&
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
