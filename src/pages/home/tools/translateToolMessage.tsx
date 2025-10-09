import { useEffect, useState } from 'react'
import { Check, X } from 'lucide-react'
import { useAgent } from '@/hooks/useAgent'
export function TranslateToolMessage() {
  const { agent, pendingResolveData } = useAgent()
  const [list, setList] = useState<
    {
      origin: string
      translate: string
      status: 'pending' | 'approve' | 'reject'
    }[]
  >([])

  useEffect(() => {
    if (pendingResolveData == null) return
    setList((prev) => [
      ...prev,
      {
        origin: pendingResolveData.sentence,
        translate: pendingResolveData.translated,
        status: 'pending',
      },
    ])
  }, [pendingResolveData])

  function onClickResolve() {
    agent.current.resolveTask()
  }

  function onClickReject() {
    agent.current.rejectTask()
  }
  return (
    <div className='space-y-2'>
      {list.map((i, index) => (
        <div
          key={i.origin + index}
          className='text-muted-foreground font-mono text-sm leading-relaxed'
        >
          <div>
            <span className='mr-2 rounded border border-gray-300 px-2'>
              oirgin text:
            </span>
            {i.origin}
          </div>
          <div>
            <span className='mr-2 rounded border border-gray-300 px-2'>
              translate text:
            </span>
            {i.translate}
          </div>
        </div>
      ))}
      {pendingResolveData && (
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
    </div>
  )
}
