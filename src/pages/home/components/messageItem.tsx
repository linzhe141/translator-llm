import type { ContextMessage } from '@/core/context'
import { Bolt, Bot, UserRound } from 'lucide-react'
import Markdown from 'react-markdown'

export const MessageItem = ({ message }: { message: ContextMessage }) => {
  const baseClasses =
    'my-4 rounded-md border p-4 text-muted-foreground font-mono text-sm leading-relaxed'

  switch (message.type) {
    case 'user':
      return (
        <div className={`${baseClasses} border-blue-200 bg-blue-50`}>
          <div className='mb-2 flex items-center gap-2'>
            <UserRound className='h-5 w-5 text-blue-600' />
            <span className='text-sm font-medium text-blue-700'>user</span>
          </div>
          <pre className='overflow-auto break-words whitespace-pre-wrap text-gray-800'>
            {message.message.content}
          </pre>
        </div>
      )

    case 'assistant':
      let content: any = null
      let type = ''
      if (typeof message.message.content === 'string') {
        // assistant text
        content = message.message.content
      } else if (
        !Array.isArray(message.message.content) &&
        typeof message.message.content === 'object' &&
        message.message.content.type === 'reasoning'
      ) {
        content = message.message.content.text
        type = 'reasoning'
      } else {
        content = message.message
        type = 'toolCall'
      }
      return (
        <div className={`${baseClasses} border-green-200 bg-green-50`}>
          <div className='mb-2 flex items-center gap-2'>
            <Bot className='h-5 w-5 text-green-600' />
            <span className='text-sm font-medium text-green-700'>
              assistant{type !== '' && ': ' + type}
            </span>
          </div>
          {type === 'toolCall' ? (
            <pre className='overflow-auto break-words whitespace-pre-wrap text-gray-800'>
              {JSON.stringify(content, null, 2)}
            </pre>
          ) : (
            <Markdown>{content}</Markdown>
          )}
        </div>
      )

    case 'tool':
      return (
        <div className={`${baseClasses} border-gray-300`}>
          <div className='mb-2 flex items-center gap-2'>
            <Bolt className='h-5 w-5 text-gray-600' />
            <span className='text-sm font-medium text-gray-700'>tool</span>
          </div>
          {message.message.content.map((i) => {
            if (i.renderer) return <i.renderer />
            return (
              <pre className='overflow-auto text-sm break-words whitespace-pre-wrap text-gray-800'>
                {JSON.stringify(i, null, 2)}
              </pre>
            )
          })}
        </div>
      )

    default:
      return null
  }
}
