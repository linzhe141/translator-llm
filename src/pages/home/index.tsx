import { useRef, useState } from 'react'
import { Bolt, Bot, MoveRight, UserRound } from 'lucide-react'
import { NavLink } from 'react-router'
import { useAgent } from '@/hooks/useAgent'
import type { ContextMessage } from '@/core/context'

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
// 消息组件
const MessageItem = ({
  message,
  index,
}: {
  message: ContextMessage
  index: number
}) => {
  const baseClasses = 'my-4 rounded-md border p-4'

  switch (message.type) {
    case 'user':
      return (
        <div
          key={index}
          className={`${baseClasses} border-blue-200 bg-blue-50`}
        >
          <div className='mb-2 flex items-center gap-2'>
            <UserRound className='h-5 w-5 text-blue-600' />
            <span className='text-sm font-medium text-blue-700'>Input</span>
          </div>
          <pre className='overflow-auto break-words whitespace-pre-wrap text-gray-800'>
            {message.message.content}
          </pre>
        </div>
      )

    case 'assistant':
      return (
        <div
          key={index}
          className={`${baseClasses} border-green-200 bg-green-50`}
        >
          <div className='mb-2 flex items-center gap-2'>
            <Bot className='h-5 w-5 text-green-600' />
            <span className='text-sm font-medium text-green-700'>
              assistant
            </span>
          </div>
          <pre className='overflow-auto break-words whitespace-pre-wrap text-gray-800'>
            {typeof message.message === 'string'
              ? message.message
              : JSON.stringify(message.message, null, 2)}
          </pre>
        </div>
      )

    case 'tool':
      return (
        <div
          key={index}
          className={`${baseClasses} border-gray-300 bg-gray-100`}
        >
          <div className='mb-2 flex items-center gap-2'>
            <Bolt className='h-5 w-5 text-gray-600' />
            <span className='text-sm font-medium text-gray-700'>tool</span>
          </div>
          <pre className='overflow-auto text-sm break-words whitespace-pre-wrap text-gray-800'>
            {JSON.stringify(message.message.content, null, 2)}
          </pre>
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
// 翻译结果组件
const TranslationResult = ({ result }: { result: Result[] }) => {
  const mouseEnterTargetType = useRef<'origin' | 'translate' | null>(null)
  const originRefs = useRef<Map<any, any>>(new Map())
  const translateRefs = useRef<Map<any, any>>(new Map())
  const originContainerRef = useRef<any>(null)
  const translateContainerRef = useRef<any>(null)
  const [textSegments, setTextSegments] = useState(result)
  const handleScroll = (type: 'origin' | 'translate') => {
    if (mouseEnterTargetType.current === 'origin' && type === 'translate')
      return
    if (mouseEnterTargetType.current === 'translate' && type === 'origin')
      return
    console.log(type)

    const container = originContainerRef.current
    const translateContainer = translateContainerRef.current
    if (!container || !translateContainer) return

    const refs = type === 'origin' ? originRefs : translateRefs
    const targetRefs = type === 'origin' ? translateRefs : originRefs
    // 找到第一个完全在视窗中的 span
    for (const item of textSegments) {
      const el = refs.current.get(item)
      if (!el) continue
      const rect = el.getBoundingClientRect()
      const containerRect = container.getBoundingClientRect()
      if (
        rect.top >= containerRect.top + 100 &&
        rect.bottom <= containerRect.bottom - 100
      ) {
        // 滚动对应的翻译
        const targetEl = targetRefs.current.get(item)
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: 'auto', block: 'nearest' })
        }
        break
      }
    }
  }
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
              onScroll={() => {
                handleScroll('origin')
              }}
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
              onScroll={() => handleScroll('translate')}
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

// 待审核内容组件
const PendingReview = ({
  pendingResolveData,
  agent,
}: {
  pendingResolveData: any
  agent: any
}) => (
  <div className='mt-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4'>
    <h4 className='mb-3 text-lg font-medium text-yellow-800'>待审核内容</h4>
    <div className='mb-4 rounded border bg-white p-3 text-sm'>
      <pre className='overflow-auto whitespace-pre-wrap'>
        {JSON.stringify(pendingResolveData, null, 2)}
      </pre>
    </div>
    <div className='flex gap-3'>
      <button
        className='rounded bg-green-500 px-4 py-2 text-white transition-colors hover:bg-green-600'
        onClick={() => agent.current.resolveTask()}
      >
        通过
      </button>
      <button
        className='rounded bg-red-500 px-4 py-2 text-white transition-colors hover:bg-red-600'
        onClick={() => agent.current.rejectTask()}
      >
        拒绝
      </button>
    </div>
  </div>
)

export default function Home() {
  const [userInput, setUserInput] = useState('')
  const { agent, pendingResolveData, messageList, state } = useAgent()

  // 开发环境下暴露agent到window对象
  if (process.env.NODE_ENV === 'development') {
    // @ts-expect-error just for testing
    window.agent = agent.current
  }

  const disabled = userInput.trim().length === 0
  const isProcessing = state !== 'workflow_complete' && state !== 'idle'

  const handleTranslate = () => {
    if (disabled) return

    // 清空agent上下文 - 这是关键改进
    if (agent.current.clear) {
      agent.current.clear()
    }

    // 提交用户输入
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

  return (
    <div className='mx-auto my-6 max-w-6xl px-4'>
      {/* 顶部导航 */}
      <div className='mb-6'>
        <NavLink
          to='/settings'
          className='inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-blue-600 transition-colors hover:bg-blue-100'
        >
          <MoveRight className='h-4 w-4' />
          <span className='text-sm font-medium'>settings</span>
        </NavLink>
      </div>

      {/* 输入区域 */}
      <div className='mb-6 space-y-4'>
        <div>
          <label className='mb-4 block text-4xl font-bold text-gray-700'>
            AI Translator Agent
          </label>
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

      {/* 状态指示器 */}
      {state && state !== 'idle' && (
        <div className='mb-4 rounded-lg bg-blue-50 px-4 py-2'>
          <span className='text-sm text-blue-700'>
            当前状态: <span className='font-medium'>{state}</span>
          </span>
        </div>
      )}

      {/* 翻译完成后显示结果 */}
      {state === 'workflow_complete' && (
        <TranslationResult
          result={agent.current.workingMemory.translationResults.map((i) => ({
            origin: i.original,
            translate: i.translated,
            active: false,
            rejectionCount: i.rejectionCount,
          }))}
        />
      )}

      {/* 消息历史 */}
      {messageList.length > 0 && state !== 'workflow_complete' && (
        <div className='space-y-4'>
          <h3 className='text-lg font-semibold text-gray-800'>处理过程</h3>
          <div className='space-y-2'>
            {messageList.map((message, index) => (
              <MessageItem key={index} message={message} index={index} />
            ))}
          </div>
        </div>
      )}

      {/* 待审核内容 */}
      {pendingResolveData && (
        <PendingReview pendingResolveData={pendingResolveData} agent={agent} />
      )}
    </div>
  )
}
