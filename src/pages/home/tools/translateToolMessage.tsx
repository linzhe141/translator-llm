import { Check, X } from 'lucide-react'
import { useAgent } from '@/hooks/useAgent'
import type { TranslateToolResultMeta } from '@/core/tools/translate'
export function TranslateToolMessage() {
  const { agent, toolExecuteMetaInfo } = useAgent()
  const { data: list } = toolExecuteMetaInfo as {
    toolName: string
    toolCallId: string
    data: TranslateToolResultMeta[]
  }

  function onClickResolve() {
    agent.current.resolveTask()
  }

  function onClickReject() {
    agent.current.rejectTask()
  }
  return (
    <div className='space-y-4'>
      {list.map((i, index) => (
        <div
          key={i.original + index}
          className='text-muted-foreground font-mono text-sm leading-relaxed'
        >
          <div>
            <span className='mr-2 rounded border border-gray-300 px-2'>
              oirgin text:
            </span>
            {i.original}
          </div>
          {i.translated.map((ele, idx) => (
            <>
              <div key={idx}>
                <span className='mr-2 rounded border border-gray-300 px-2'>
                  translate text:
                </span>
                {ele.text}
              </div>
              {ele.status === 'pending' && (
                <div className='flex gap-3'>
                  <button
                    className='flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs text-emerald-400 transition-colors'
                    onClick={() => onClickResolve()}
                  >
                    <span>
                      <Check className='mr-2 h-4 w-4' />
                    </span>
                    通过
                  </button>
                  <button
                    className='flex items-center rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs text-red-400 transition-colors'
                    onClick={() => onClickReject()}
                  >
                    <span>
                      <X className='mr-2 h-4 w-4' />
                    </span>
                    拒绝
                  </button>
                </div>
              )}
            </>
          ))}
        </div>
      ))}
    </div>
  )
}
