import { useEffect, useRef, useState } from 'react'
import { MoveRight, Loader2, Info, Github } from 'lucide-react'
import { NavLink } from 'react-router'
import { useAgent } from '@/hooks/useAgent'
import logo from '../../../logo.png'
import { MessageItem } from './components/messageItem'
import { TranslationResult } from './components/translationResult'
import { useSettingsStore } from '@/store/settings'
import { toast } from 'sonner'

const LANGUAGES = [
  { name: '中文', flag: '🇨🇳' },
  { name: '古文(文言文)', flag: '🇨🇳' },
  { name: 'English', flag: '🇺🇸' },
  { name: '日本語', flag: '🇯🇵' },
  { name: '한국어', flag: '🇰🇷' },
  { name: 'Français', flag: '🇫🇷' },
] as const

export default function Home() {
  const [userInput, setUserInput] = useState('')
  const { agent, messageList, state, reset } = useAgent()
  const [targetLang, setTargetLang] = useState('古文(文言文)')
  const oldTargetLang = useRef('')
  const [customLang, setCustomLang] = useState('')
  const { apiKey, baseUrl, modelID } = useSettingsStore()

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
    if (!apiKey || !baseUrl || !modelID) {
      toast.error(
        <div className='text-red-500'>
          请先前往设置页面，配置 API Key、Base URL 及 Reason Model ID！
        </div>
      )
      return
    }
    if (disabled) return

    agent.current.init()

    agent.current.userSubmit({
      content: `translate this to ${targetLang || customLang}: ${userInput}`,
      role: 'user',
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (e.ctrlKey || e.shiftKey) {
        // 让浏览器处理默认的换行行为
        return
      } else {
        // 阻止默认换行，触发提交
        e.preventDefault()
        if (!disabled) {
          handleTranslate()
        }
      }
    }
  }

  const [showToButtom, setShowToButtom] = useState(false)
  const pleaceholderRef = useRef<HTMLDivElement>(null)
  function clickToButtomHandle() {
    pleaceholderRef.current?.scrollIntoView({ behavior: 'smooth' })
  }
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setShowToButtom(!entry.isIntersecting)
        })
      },
      { threshold: 0.5 }
    )
    observer.observe(pleaceholderRef.current!)
    return () => observer.disconnect()
  }, [])
  useEffect(() => {
    agent.current.init()
    reset()
  }, [agent, reset])
  useEffect(() => {
    const cancel = agent.current.cancel.bind(agent.current)
    return () => {
      if (isProcessing) {
        console.log('abort when leave this page')
        cancel()
      }
    }
  }, [agent, isProcessing])
  return (
    <div className='flex h-screen flex-col'>
      <div className='h-0 flex-1 overflow-auto py-6'>
        <div className='mx-auto max-w-5xl'>
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
              <div className='mb-4 flex flex-wrap items-center gap-2'>
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.name}
                    onClick={() => {
                      setTargetLang(lang.name)
                      setCustomLang('')
                    }}
                    className={`rounded-full border px-3 py-1 text-sm transition-all ${
                      targetLang === lang.name
                        ? 'border-blue-500 bg-blue-100 text-blue-600'
                        : 'border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    <span className='mr-1'>{lang.flag}</span>
                    {lang.name}
                  </button>
                ))}
                <input
                  type='text'
                  placeholder='其他语言...'
                  value={customLang}
                  onChange={(e) => {
                    if (e.target.value && targetLang) {
                      oldTargetLang.current = targetLang
                      setTargetLang('')
                    }
                    setCustomLang(e.target.value)
                    if (!e.target.value) {
                      setTargetLang(oldTargetLang.current)
                    }
                  }}
                  className='ml-2 w-40 rounded-lg border border-gray-300 px-3 py-1 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200'
                />
              </div>
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

        <div className='h-[200px]' ref={pleaceholderRef}></div>
        {showToButtom && (
          <button
            v-if='showToButtom'
            className='fixed bottom-10 left-1/2 z-100 -translate-x-1/2 cursor-pointer rounded-full border-1 border-gray-300 bg-gray-50 p-2 shadow-xl hover:shadow-2xl'
            onClick={clickToButtomHandle}
          >
            <svg
              xmlns='http://www.w3.org/2000/svg'
              width='24'
              height='24'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              stroke-width='2'
              stroke-linecap='round'
              stroke-linejoin='round'
            >
              <path d='M12 5v14' />
              <path d='m19 12-7 7-7-7' />
            </svg>
          </button>
        )}
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
          {isProcessing &&
            (state !== 'tool_executing' ? (
              <button
                className='ml-2 flex items-center gap-1 rounded-md border border-red-200 bg-red-100 px-3 py-1 text-sm font-medium text-red-600 shadow transition-colors hover:bg-red-200 active:bg-red-300'
                onClick={() => agent.current.cancel()}
              >
                <Loader2 className='mr-1 h-4 w-4 animate-spin' />
                abort
              </button>
            ) : (
              <Loader2 className='mr-1 h-4 w-4 animate-spin' />
            ))}
        </div>
      )}
    </div>
  )
}
