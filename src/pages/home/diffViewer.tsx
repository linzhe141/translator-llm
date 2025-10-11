import { diffWords } from 'diff'
interface Props {
  compare1: string
  compare2: string
}
export function DiffViewer(props: Props) {
  const { compare1, compare2 } = props
  const diff = diffWords(compare1, compare2)
  function getStatus() {
    let added = 0
    let removed = 0
    let unchanged = 0

    diff.forEach((part) => {
      if (part.added) {
        added += part.value.split(' ').filter((w) => w.trim()).length
      } else if (part.removed) {
        removed += part.value.split(' ').filter((w) => w.trim()).length
      } else {
        unchanged += part.value.split(' ').filter((w) => w.trim()).length
      }
    })

    return { added, removed, unchanged, total: added + removed + unchanged }
  }

  const status = getStatus()

  return (
    <div className='space-y-3'>
      {/* 统计信息 */}
      <div className='flex items-center gap-4 text-xs'>
        <div className='flex items-center gap-1.5'>
          <span className='inline-block h-2 w-2 rounded-full bg-emerald-500'></span>
          <span className='text-gray-600'>添加: {status.added}</span>
        </div>
        <div className='flex items-center gap-1.5'>
          <span className='inline-block h-2 w-2 rounded-full bg-red-500'></span>
          <span className='text-gray-600'>删除: {status.removed}</span>
        </div>
        <div className='flex items-center gap-1.5'>
          <span className='inline-block h-2 w-2 rounded-full bg-gray-400'></span>
          <span className='text-gray-600'>未变: {status.unchanged}</span>
        </div>
      </div>

      {/* Diff 内容 */}
      <div className='rounded-lg border border-gray-200 bg-gray-50 p-4'>
        <div className='font-mono text-sm leading-relaxed'>
          {diff.map((part, index) => {
            if (part.added) {
              return (
                <span
                  key={index}
                  className='rounded bg-emerald-100 px-1 text-emerald-800'
                  style={{ textDecoration: 'none' }}
                >
                  {part.value}
                </span>
              )
            } else if (part.removed) {
              return (
                <span
                  key={index}
                  className='rounded bg-red-100 px-1 text-red-800 line-through'
                >
                  {part.value}
                </span>
              )
            } else {
              return (
                <span key={index} className='text-gray-700'>
                  {part.value}
                </span>
              )
            }
          })}
        </div>
      </div>
    </div>
  )
}
