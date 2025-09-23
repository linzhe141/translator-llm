import { useRef, useState } from 'react'
import { originText, segments } from './mocktext'
import { Agent } from '@/core/agent'

export default function Home() {
  const [useInput, setUserInput] = useState('')
  const disabled = useInput.trim().length === 0
  const [content, setContent] = useState('')
  const originRefs = useRef<Map<any, any>>(new Map())
  const translateRefs = useRef<Map<any, any>>(new Map())
  const originContainerRef = useRef<any>(null)
  const translateContainerRef = useRef<any>(null)
  const mouseEnterTargetType = useRef<'origin' | 'translate' | null>(null)

  const agent = useRef(new Agent())
  // 源文本和翻译文本的对齐
  const [textSegments, setTextSegments] = useState<
    {
      origin: string
      translate: string
      active: boolean
    }[]
  >([])

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

  async function mockResponse() {
    let i = 0
    while (i < segments.length) {
      setTextSegments((oldvalue) =>
        oldvalue.concat({ ...segments[i], active: false })
      )
      await new Promise((resolve) => setTimeout(resolve, 100))
      i++
    }
  }
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

  return (
    <div className='mx-auto my-4 w-[1000px]'>
      <textarea
        className='w-full rounded-md border border-gray-300 p-2 outline-0 focus:border-blue-700'
        value={useInput}
        onChange={(e) => setUserInput(e.target.value)}
        rows={10}
      />
      <button
        disabled={disabled}
        className={`w-full rounded-md border bg-blue-500 p-2 text-white ${
          disabled ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-blue-600'
        }`}
        onClick={() => {
          // console.log('useInput', useInput)
          // // navigate('/settings')
          // setContent(originText)
          // mockResponse()
          agent.current.userSubmit({
            content: useInput,
            role: 'user',
          })
        }}
      >
        translate
      </button>

      {content && (
        <div className='mt-2 flex gap-2 text-sm'>
          <pre
            ref={originContainerRef}
            onScroll={() => {
              handleScroll('origin')
            }}
            onMouseEnter={() => (mouseEnterTargetType.current = 'origin')}
            onMouseLeave={() => (mouseEnterTargetType.current = null)}
            className='animation-wrapper h-[400px] w-0 flex-1 overflow-auto rounded border border-gray-300 p-2 whitespace-pre-line'
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
          <pre
            ref={translateContainerRef}
            onScroll={() => handleScroll('translate')}
            onMouseEnter={() => (mouseEnterTargetType.current = 'translate')}
            onMouseLeave={() => (mouseEnterTargetType.current = null)}
            className='animation-wrapper h-[400px] w-0 flex-1 overflow-auto rounded border border-gray-300 p-2 whitespace-pre-line'
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
      )}
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
