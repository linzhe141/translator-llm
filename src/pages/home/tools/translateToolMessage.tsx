import { Check, X } from 'lucide-react'
import { useAgent } from '@/hooks/useAgent'
import type { TranslateToolResultMeta } from '@/core/tools/translate'
import { DiffViewer } from '../diffViewer'
import { translateToolUIPlaceholder } from '@/common'
import { useState } from 'react'

export function TranslateToolMessage() {
  const { agent, toolExecuteMetaInfo } = useAgent()
  const toolMeta = toolExecuteMetaInfo as {
    toolName: string
    toolCallId: string
    splits: {
      sentence: string
      leading: string
      trailing: string
    }[]
    data: TranslateToolResultMeta[]
  }
  const { splits, data: list } = toolMeta
  const [currentIndex, setCurrentIndex] = useState(0)
  function onClickResolve() {
    if (currentIndex < splits.length - 1) {
      setCurrentIndex(currentIndex + 1)
    }
    agent.current.resolveTask()
  }

  function onClickReject() {
    agent.current.rejectTask()
  }

  return (
    <div className='space-y-6'>
      {list.map((i, index) => (
        <div
          key={i.original + index}
          className='rounded-xl border border-gray-200 bg-white p-5 shadow-sm'
        >
          <div className='mb-4'>
            <div className='mb-2 flex items-center gap-2'>
              <span className='inline-flex items-center rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700'>
                原文
              </span>
            </div>
            <div className='rounded-lg bg-gray-50 p-3 font-mono text-sm leading-relaxed text-gray-800'>
              {i.original}
            </div>
          </div>

          <div className='space-y-4'>
            {i.translated.map((ele, idx) => (
              <div key={idx} className='space-y-3'>
                <div className='flex items-center gap-2'>
                  <span className='inline-flex items-center rounded-md border border-purple-200 bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700'>
                    译文 #{idx + 1}
                    <span
                      className={`ml-4 ${ele.status === 'approved' ? 'text-emerald-500' : ele.status === 'rejected' ? 'text-red-500' : 'text-gray-500'}`}
                    >
                      {ele.status}
                    </span>
                  </span>
                </div>

                {ele.text === translateToolUIPlaceholder ? (
                  <div className='animate-pulse rounded-lg bg-gray-50 p-3 font-mono text-sm leading-relaxed text-gray-800'>
                    <div className='mb-2 h-4 w-3/4 rounded bg-gray-200'></div>
                    <div className='mb-2 h-4 w-5/6 rounded bg-gray-200'></div>
                    <div className='h-4 w-2/3 rounded bg-gray-200'></div>
                  </div>
                ) : (
                  <div className='rounded-lg bg-gray-50 p-3 font-mono text-sm leading-relaxed text-gray-800'>
                    {ele.text}
                  </div>
                )}

                {idx > 0 && ele.text !== translateToolUIPlaceholder && (
                  <div className='mt-3'>
                    <div className='mb-2 text-xs font-medium text-gray-600'>
                      与上一次翻译的差异：
                    </div>
                    <DiffViewer
                      compare1={i.translated[idx - 1].text}
                      compare2={ele.text}
                    />
                  </div>
                )}

                {ele.status === 'pending' &&
                  ele.text !== translateToolUIPlaceholder && (
                    <div className='flex gap-3 pt-2'>
                      <button
                        className='flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-emerald-600 active:scale-95'
                        onClick={() => onClickResolve()}
                      >
                        <Check className='h-4 w-4' />
                        通过
                      </button>
                      <button
                        className='flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-red-600 active:scale-95'
                        onClick={() => onClickReject()}
                      >
                        <X className='h-4 w-4' />
                        拒绝
                      </button>
                    </div>
                  )}
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className='flex justify-center'>
        <div className='inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-2.5 shadow-lg ring-4 ring-indigo-50'>
          <div className='flex items-center gap-2'>
            <div className='flex h-8 w-8 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm'>
              <span className='text-sm font-bold text-white'>
                {currentIndex + 1}
              </span>
            </div>
            <span className='text-sm font-medium text-white/90'>/</span>
            <div className='flex h-8 w-8 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm'>
              <span className='text-sm font-bold text-white'>
                {splits.length}
              </span>
            </div>
          </div>
          <div className='h-4 w-px bg-white/30'></div>
          <span className='text-xs font-medium text-white/90'>翻译进度</span>
        </div>
      </div>
    </div>
  )
}
