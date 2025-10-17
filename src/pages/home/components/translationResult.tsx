import React, { useRef, useState } from 'react'

interface Result {
  origin: string
  translate: string
  active: boolean
  rejectionCount: number
}

const REJECTION_STYLES = {
  low: { text: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200' },
  medium: { text: 'text-orange-600', bg: 'bg-orange-50 border-orange-200' },
  high: { text: 'text-red-600', bg: 'bg-red-50 border-red-200' },
}

const getRejectionLevel = (count: number) => {
  if (count <= 2) return 'low'
  if (count <= 5) return 'medium'
  return 'high'
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

const PanelHeader = ({
  title,
  stat,
}: {
  title: string
  color: string
  stat: React.ReactNode
}) => {
  return (
    <div className={`flex-none border-b border-gray-200 px-6 py-4`}>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <div className={`h-2 w-2 rounded-full`}></div>
          <h4 className='text-sm font-semibold tracking-wide text-gray-700 uppercase'>
            {title}
          </h4>
        </div>
        <div className='text-xs text-gray-500'>{stat}</div>
      </div>
    </div>
  )
}

const TextSegment = ({
  item,
  index,
  type,
  onHover,
  onLeave,
  setRef,
}: {
  item: Result
  index: number
  type: 'origin' | 'translate'
  onHover: () => void
  onLeave: () => void
  setRef: (el: HTMLElement | null) => void
}) => {
  const text = type === 'origin' ? item.origin : item.translate
  const level = getRejectionLevel(item.rejectionCount)
  const styles = REJECTION_STYLES[level]

  return (
    <span key={index}>
      <span
        className={`cursor-pointer rounded transition-all duration-200 hover:bg-amber-200 hover:shadow-sm ${
          item.active ? 'bg-amber-300 font-medium shadow-sm' : ''
        }`}
        onMouseEnter={onHover}
        onMouseLeave={onLeave}
        ref={setRef}
      >
        {text}
      </span>
      {type === 'translate' && item.rejectionCount > 0 && (
        <span
          className={`ml-1 inline-flex items-center justify-center rounded border px-1.5 py-0.5 text-xs font-bold ${styles.bg} ${styles.text}`}
          title={`拒绝次数: ${item.rejectionCount}`}
        >
          ×{item.rejectionCount}
        </span>
      )}
    </span>
  )
}

const TranslationPanel = ({
  type,
  segments,
  containerRef,
  refsMap,
  onMouseEnter,
  onMouseLeave,
  onSegmentHover,
  onSegmentLeave,
}: {
  type: 'origin' | 'translate'
  segments: Result[]
  containerRef: React.RefObject<HTMLDivElement | null>
  refsMap: React.RefObject<Map<any, any>>
  onMouseEnter: () => void
  onMouseLeave: () => void
  onSegmentHover: (item: Result) => void
  onSegmentLeave: () => void
}) => {
  const config = {
    origin: {
      title: '原文',
      color: 'emerald',
      scrollbar: 'scrollbar-thumb-gray-300',
      stat: <span>{segments.length}段</span>,
    },
    translate: {
      title: '译文',
      color: 'blue',
      scrollbar: 'scrollbar-thumb-blue-300',
      stat: (
        <span>
          失败：{segments.reduce((sum, item) => sum + item.rejectionCount, 0)}次
        </span>
      ),
    },
  }[type]

  return (
    <div
      className={`flex flex-1 flex-col border ${type === 'translate' ? 'border-l-0' : ''} border-gray-200 bg-white/50`}
    >
      <PanelHeader
        title={config.title}
        color={config.color}
        stat={config.stat}
      />
      <div
        className={`scrollbar-thin ${config.scrollbar} scrollbar-track-transparent flex-1 overflow-y-auto p-6`}
        ref={containerRef}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <pre className='font-mono text-sm leading-relaxed whitespace-pre-wrap text-gray-800'>
          {segments.map((item, index) => (
            <TextSegment
              key={index}
              item={item}
              index={index}
              type={type}
              onHover={() => onSegmentHover(item)}
              onLeave={onSegmentLeave}
              setRef={(el) => refsMap.current.set(item, el)}
            />
          ))}
        </pre>
      </div>
    </div>
  )
}

export const TranslationResult = ({ result }: { result: Result[] }) => {
  const mouseEnterTargetType = useRef<'origin' | 'translate' | null>(null)
  const originRefs = useRef<Map<any, any>>(new Map())
  const translateRefs = useRef<Map<any, any>>(new Map())
  const originContainerRef = useRef<HTMLDivElement>(null)
  const translateContainerRef = useRef<HTMLDivElement>(null)
  const [textSegments, setTextSegments] = useState(result)

  const alignSourceMap = (data: Result, type: 'origin' | 'translate') => {
    setTextSegments((prev) =>
      prev.map((item) => ({ ...item, active: item === data }))
    )

    const refs = type === 'origin' ? translateRefs : originRefs
    const container =
      type === 'origin'
        ? translateContainerRef.current
        : originContainerRef.current

    const el = refs.current.get(data)
    if (el && container && !isElementInContainer(el, container)) {
      el.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const cancelAlignSourceMap = () => {
    setTextSegments((prev) => prev.map((item) => ({ ...item, active: false })))
  }

  return (
    <div className='mt-6 space-y-4'>
      <h3 className='text-lg font-semibold text-gray-800'>翻译结果</h3>
      <div className='flex flex-1 overflow-hidden'>
        <TranslationPanel
          type='origin'
          segments={textSegments}
          containerRef={originContainerRef}
          refsMap={originRefs}
          onMouseEnter={() => (mouseEnterTargetType.current = 'origin')}
          onMouseLeave={() => (mouseEnterTargetType.current = null)}
          onSegmentHover={(item) => alignSourceMap(item, 'origin')}
          onSegmentLeave={cancelAlignSourceMap}
        />
        <TranslationPanel
          type='translate'
          segments={textSegments}
          containerRef={translateContainerRef}
          refsMap={translateRefs}
          onMouseEnter={() => (mouseEnterTargetType.current = 'translate')}
          onMouseLeave={() => (mouseEnterTargetType.current = null)}
          onSegmentHover={(item) => alignSourceMap(item, 'translate')}
          onSegmentLeave={cancelAlignSourceMap}
        />
      </div>
    </div>
  )
}
