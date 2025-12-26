import { tool, type ToolCallPart } from 'ai'
import { z } from 'zod'
import type { Agent } from '../agent'
import { remark } from 'remark'
import { visit } from 'unist-util-visit'

const description = `
This tool (name: 'split') splits a markdown text into natural-language segments.
It parses the markdown structure and splits text within each block using sentence boundaries.

Example:
Input: "# Title\n\nThis is a test. This is another test.\n\n- List item one."
Output: {splits: ["# Title\n\n", "This is a test. ", "This is another test.\n\n", "- List item one."]}
`

const inputSchema = z.object({
  text: z.string().describe('The original markdown text string to split'),
})

export const splitTool = tool({
  name: 'split',
  description,
  inputSchema,
})

// 基于正则计算边界索引（相对于给定文本的起始位置）
function getBoundaryIndices(text: string, startOffset: number = 0): number[] {
  const indices: number[] = []
  // 匹配句子结束符号（中英文标点）后面可能有空格或换行
  const regex = /[。！？?!.](?=\s|$)/g
  let match
  while ((match = regex.exec(text)) !== null) {
    // 返回相对于原始文本的绝对索引
    indices.push(startOffset + match.index + match[0].length)
  }
  return indices
}

function splitByIndices(text: string, indices: number[]): string[] {
  const segments: string[] = []
  let start = 0
  for (const end of indices) {
    segments.push(text.slice(start, end))
    start = end
  }
  if (start < text.length) {
    segments.push(text.slice(start))
  }
  return segments
}

// 收集所有分割点的索引
function collectSplitIndices(text: string): number[] {
  const allIndices: number[] = []

  try {
    // 解析 markdown AST
    const ast = remark.parse(text)

    // 遍历 AST 节点
    visit(ast, (node) => {
      // 处理包含文本的块级节点
      if (
        node.type === 'paragraph' ||
        node.type === 'heading' ||
        node.type === 'listItem' ||
        node.type === 'blockquote'
      ) {
        if (!node.position) return

        const blockStart = node.position.start.offset!
        const blockEnd = node.position.end.offset!
        const blockText = text.slice(blockStart, blockEnd)

        // 对于标题，在块结束位置添加分割点
        if (node.type === 'heading') {
          allIndices.push(blockEnd)
          return
        }

        // 对于其他块，在块内使用句子边界分割
        const blockIndices = getBoundaryIndices(blockText, blockStart)
        allIndices.push(...blockIndices)

        // 如果块内没有句子边界，在块结束位置添加分割点
        if (blockIndices.length === 0) {
          allIndices.push(blockEnd)
        }
      }

      // 处理代码块
      if (node.type === 'code') {
        if (node.position) {
          // 代码块整体作为一个 segment，在结束位置添加分割点
          allIndices.push(node.position.end.offset!)
        }
      }
    })
  } catch (error) {
    console.error('Failed to parse markdown:', error)
    // 如果解析失败，回退到原来的简单分割方法
    return getBoundaryIndices(text)
  }

  // 去重并排序
  return [...new Set(allIndices)].sort((a, b) => a - b)
}

export const splitExecutor = async (
  input: z.infer<typeof inputSchema>,
  agent: Agent,
  _toolCall: ToolCallPart
) => {
  const indices = collectSplitIndices(input.text)
  const segments = splitByIndices(input.text, indices)
  console.log('split segments', segments)
  agent.workingMemory.splitTexts = segments
  return { splits: segments, status: 'split completed' }
}
