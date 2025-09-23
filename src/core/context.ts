import { type ModelMessage } from 'ai'
export class Context<T extends ModelMessage = ModelMessage> {
  subscribers = new Set<any>()
  private messages: T[] = []
  subscribe(callback: any) {
    this.subscribers.add(callback)
    return () => this.subscribers.delete(callback)
  }
  addMessage(message: T) {
    this.setMessages([...this.messages, message])
  }
  setMessages(messages: T[]) {
    this.messages = messages
    this.subscribers.forEach((callback) => {
      callback()
    })
  }
  deleteMessage(message: T) {
    this.setMessages(this.messages.filter((m) => m !== message))
  }

  getMessages(): T[] {
    return this.messages
  }

  toModelMessages(): ModelMessage[] {
    return this.messages.map((i) => {
      if (i.role === 'tool') {
        return {
          role: 'tool',
          content: i.content.map((elm) => {
            // @ts-expect-error xxx
            elm.output.value.status = i.status
            return elm
          }),
        }
      }
      return i
    })
  }
}
