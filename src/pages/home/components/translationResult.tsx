import { useRef, useState } from 'react'

interface Result {
  origin: string
  translate: string
  active: boolean
  rejectionCount: number
}

export const TranslationResult = ({ result }: { result: Result[] }) => {
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

  const getRejectionColor = (count: number) => {
    if (count <= 2) return 'text-yellow-600'
    if (count <= 5) return 'text-orange-600'
    return 'text-red-600'
  }

  const getRejectionBg = (count: number) => {
    if (count <= 2) return 'bg-yellow-50 border-yellow-200'
    if (count <= 5) return 'bg-orange-50 border-orange-200'
    return 'bg-red-50 border-red-200'
  }

  return (
    <div className='mt-6 space-y-4'>
      <h3 className='text-lg font-semibold text-gray-800'>翻译结果</h3>

      <div className='flex flex-1 overflow-hidden'>
        <div className='flex flex-1 flex-col border border-gray-200 bg-white/50'>
          <div className='flex-none border-b border-gray-200 bg-emerald-50/50 px-6 py-4'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <div className='h-2 w-2 rounded-full bg-emerald-500'></div>
                <h4 className='text-sm font-semibold tracking-wide text-gray-700 uppercase'>
                  原文
                </h4>
              </div>
              <div className='text-xs text-gray-500'>
                共 {textSegments.length} 段
              </div>
            </div>
          </div>
          <div
            className='scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent flex-1 overflow-y-auto p-6'
            ref={originContainerRef}
            onMouseEnter={() => (mouseEnterTargetType.current = 'origin')}
            onMouseLeave={() => (mouseEnterTargetType.current = null)}
          >
            <pre className='font-mono text-sm leading-relaxed whitespace-pre-wrap text-gray-800'>
              {textSegments.map((item, index) => (
                <span
                  key={index}
                  className={`cursor-pointer rounded transition-all duration-200 hover:bg-amber-200 hover:shadow-sm ${item.active ? 'bg-amber-300 font-medium shadow-sm' : ''} `}
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

        <div className='flex flex-1 flex-col border border-l-0 border-gray-200 bg-white/50'>
          <div className='flex-none border-b border-gray-200 bg-blue-50/50 px-6 py-4'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <div className='h-2 w-2 rounded-full bg-blue-500'></div>
                <h4 className='text-sm font-semibold tracking-wide text-gray-700 uppercase'>
                  译文
                </h4>
              </div>
              <div className='text-xs text-gray-500'>
                失败:
                {textSegments.reduce(
                  (sum, item) => sum + item.rejectionCount,
                  0
                )}
                次
              </div>
            </div>
          </div>
          <div
            className='scrollbar-thin scrollbar-thumb-blue-300 scrollbar-track-transparent flex-1 overflow-y-auto p-6'
            ref={translateContainerRef}
            onMouseEnter={() => (mouseEnterTargetType.current = 'translate')}
            onMouseLeave={() => (mouseEnterTargetType.current = null)}
          >
            <pre className='font-mono text-sm leading-relaxed whitespace-pre-wrap text-gray-800'>
              {textSegments.map((item, index) => (
                <span key={index}>
                  <span
                    className={`cursor-pointer rounded transition-all duration-200 hover:bg-amber-200 hover:shadow-sm ${item.active ? 'bg-amber-300 font-medium shadow-sm' : ''} `}
                    onMouseEnter={() => alignSourceMap(item, 'translate')}
                    onMouseLeave={() => cancelAlignSourceMap()}
                    ref={(el) => {
                      translateRefs.current.set(item, el)
                    }}
                  >
                    {item.translate}
                  </span>
                  {item.rejectionCount > 0 && (
                    <span
                      className={`ml-1 inline-flex items-center justify-center rounded border px-1.5 py-0.5 text-xs font-bold ${getRejectionBg(item.rejectionCount)} ${getRejectionColor(item.rejectionCount)} `}
                      title={`拒绝次数: ${item.rejectionCount}`}
                    >
                      ×{item.rejectionCount}
                    </span>
                  )}
                </span>
              ))}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}

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
