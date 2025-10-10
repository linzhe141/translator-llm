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
  getStatus()
  return <div>diff</div>
}
