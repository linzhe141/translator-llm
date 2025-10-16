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
