import { useEffect, useRef, useState } from 'react'
import {
  Bolt,
  Bot,
  MoveRight,
  UserRound,
  Loader2,
  Info,
  Github,
} from 'lucide-react'
import { NavLink } from 'react-router'
import { useAgent } from '@/hooks/useAgent'
import type { ContextMessage } from '@/core/context'
import Markdown from 'react-markdown'
import logo from '../../../logo.png'

const isElementInContainer = (element: HTMLElement, container: HTMLElement) => {
  const elementRect = element.getBoundingClientRect()
  const containerRect = container.getBoundingClientRect()

  return (
    elementRect.top >= containerRect.top &&
    elementRect.left >= containerRect.left &&
    elementRect.bottom <= containerRect.bottom &&
    elementRect.right <= containerRect.right
  )
}

const MessageItem = ({ message }: { message: ContextMessage }) => {
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

interface Result {
  origin: string
  translate: string
  active: boolean
  rejectionCount: number
}

const TranslationResult = ({ result }: { result: Result[] }) => {
  const mouseEnterTargetType = useRef<'origin' | 'translate' | null>(null)
  const originRefs = useRef<Map<any, any>>(new Map())
  const translateRefs = useRef<Map<any, any>>(new Map())
  const originContainerRef = useRef<any>(null)
  const translateContainerRef = useRef<any>(null)
  const [textSegments, setTextSegments] = useState(result)

  function alignSourceMap(
    data: {
      origin: string
      translate: string
      active: boolean
    },
    type: 'origin' | 'translate'
  ) {
    const target = textSegments.find((i) => i === data)
    if (target) {
      target.active = true
    }
    setTextSegments(
      textSegments.slice(0).map((i) => {
        return { ...i, active: i === target }
      })
    )
    const refs = type === 'origin' ? translateRefs : originRefs
    const container =
      type === 'origin'
        ? translateContainerRef.current
        : originContainerRef.current
    const el = refs.current.get(data)
    if (el && !isElementInContainer(el, container)) {
      el.scrollIntoView({ behavior: 'smooth' })
    }
  }
  function cancelAlignSourceMap() {
    setTextSegments(
      textSegments.slice(0).map((i) => {
        return { ...i, active: false }
      })
    )
  }
  return (
    <div className='mt-6 space-y-4'>
      <h3 className='text-lg font-semibold text-gray-800'>翻译结果</h3>
      <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
        <div className='space-y-2'>
          <h4 className='text-sm font-medium text-gray-600'>原文</h4>
          <div className='min-h-[200px] rounded-lg border border-gray-300 bg-gray-50 p-4'>
            <pre
              className='font-mono text-sm whitespace-pre-wrap text-gray-800'
              ref={originContainerRef}
              onMouseEnter={() => (mouseEnterTargetType.current = 'origin')}
              onMouseLeave={() => (mouseEnterTargetType.current = null)}
            >
              {textSegments.map((item) => (
                <span
                  className={`hover:bg-amber-100 ${item.active ? 'bg-amber-100' : ''}`}
                  onMouseEnter={() => alignSourceMap(item, 'origin')}
                  onMouseLeave={() => cancelAlignSourceMap()}
                  ref={(el) => {
                    originRefs.current.set(item, el)
                  }}
                >
                  {item.origin}
                </span>
              ))}
            </pre>
          </div>
        </div>
        <div className='space-y-2'>
          <h4 className='text-sm font-medium text-gray-600'>译文</h4>
          <div className='min-h-[200px] rounded-lg border border-gray-300 bg-blue-50 p-4'>
            <pre
              className='font-mono text-sm whitespace-pre-wrap text-gray-800'
              ref={translateContainerRef}
              onMouseEnter={() => (mouseEnterTargetType.current = 'translate')}
              onMouseLeave={() => (mouseEnterTargetType.current = null)}
            >
              {textSegments.map((item) => (
                <span
                  className={`hover:bg-amber-100 ${item.active ? 'bg-amber-100' : ''}`}
                  onMouseEnter={() => alignSourceMap(item, 'translate')}
                  onMouseLeave={() => cancelAlignSourceMap()}
                  ref={(el) => {
                    translateRefs.current.set(item, el)
                  }}
                >
                  {item.translate}
                </span>
              ))}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  const [userInput, setUserInput] = useState('')
  const { agent, messageList, state } = useAgent()

  // 开发环境下暴露agent到window对象
  if (process.env.NODE_ENV === 'development') {
    // @ts-expect-error just for testing
    window.agent = agent.current
  }

  const disabled = userInput.trim().length === 0
  const isProcessing =
    state !== 'workflow_complete' &&
    state !== 'idle' &&
    state !== 'error' &&
    state !== 'abort'

  const handleTranslate = () => {
    if (disabled) return

    agent.current.clear()

    agent.current.userSubmit({
      content: userInput,
      role: 'user',
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey && !disabled) {
      handleTranslate()
    }
  }

  const scrollRef = useRef<HTMLDivElement>(null)

  // 自动滚动到底
  useEffect(() => {
    if ((isProcessing || state === 'workflow_complete') && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messageList, isProcessing, state])

  return (
    <div className='flex h-screen flex-col'>
      <div className='h-0 flex-1 overflow-auto py-6' ref={scrollRef}>
        <div className='mx-auto max-w-6xl'>
          {/* 顶部导航 */}
          <div className='mb-6 flex justify-between'>
            <NavLink
              to='/settings'
              className='inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-blue-600 transition-colors hover:bg-blue-100'
            >
              <MoveRight className='h-4 w-4' />
              <span className='text-sm font-medium'>settings</span>
            </NavLink>
            <NavLink
              to='https://github.com/linzhe141/translator-llm'
              target='_blank'
            >
              <Github className='h-4 w-4' />
            </NavLink>
          </div>

          {/* 输入区域 */}
          <div className='mb-6 space-y-4'>
            <div>
              <div className='flex flex-col items-center justify-center'>
                <img src={logo} height={'200px'} width={'200px'} />
                <label className='mb-8 block text-4xl font-bold text-gray-700'>
                  AI Translator Agent
                </label>
              </div>
              <p className='mb-3 text-sm text-gray-600'>
                基于大语言模型的Agent架构，具备上下文理解、多轮对话和智能决策能力。
                支持复杂文本的语境分析和专业术语处理，提供更准确、自然的翻译结果。
              </p>
              <textarea
                className='w-full resize-none rounded-lg border border-gray-300 p-4 transition-all outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={8}
                disabled={isProcessing}
                placeholder='输入任意语言的文本，AI Agent将智能识别语言并提供精准翻译... (Ctrl+Enter 快速提交)'
              />
            </div>

            <button
              disabled={disabled || isProcessing}
              className={`w-full rounded-lg px-6 py-3 font-medium transition-all ${
                disabled || isProcessing
                  ? 'cursor-not-allowed bg-gray-300 text-gray-500'
                  : 'cursor-pointer bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700'
              }`}
              onClick={handleTranslate}
            >
              {isProcessing
                ? 'AI Translator Agent 分析处理中...'
                : '启动 AI Translator Agent 翻译'}
            </button>
          </div>

          {/* 消息历史 */}
          {messageList.length > 0 && (
            <div className='space-y-4'>
              <h3 className='text-lg font-semibold text-gray-800'>处理过程</h3>
              <div className='space-y-2'>
                {messageList.map((message) => (
                  <MessageItem key={message.id} message={message} />
                ))}
              </div>
            </div>
          )}

          {/* 翻译完成后显示结果 */}
          {state === 'workflow_complete' &&
            agent.current.workingMemory.translationResults.length > 0 && (
              <TranslationResult
                result={agent.current.workingMemory.translationResults.map(
                  (i) => ({
                    origin: i.original,
                    translate: i.translated,
                    active: false,
                    rejectionCount: i.rejectionCount,
                  })
                )}
              />
            )}
        </div>

        <div className='h-[200px]'></div>
      </div>

      {/* 状态指示器 */}
      {state !== 'idle' && (
        <div className='mx-4 mb-4 flex items-center gap-3 rounded-lg bg-blue-50 px-4 py-2 shadow-sm'>
          <Info
            className={`h-4 w-4 ${state !== 'error' ? 'text-blue-600' : 'text-red-400'}`}
          />
          <span
            className={`text-sm ${state !== 'error' ? 'text-blue-700' : 'text-red-500'}`}
          >
            当前状态：
            <span className='ml-1 font-medium'>{state}</span>
          </span>
          {isProcessing && (
            <button
              className='ml-2 flex items-center gap-1 rounded-md border border-red-200 bg-red-100 px-3 py-1 text-sm font-medium text-red-600 shadow transition-colors hover:bg-red-200 active:bg-red-300'
              onClick={() => agent.current.cancel()}
            >
              <Loader2 className='mr-1 h-4 w-4 animate-spin' />
              abort
            </button>
          )}
        </div>
      )}
    </div>
  )
}
