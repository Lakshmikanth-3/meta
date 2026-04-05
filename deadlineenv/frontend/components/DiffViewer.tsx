'use client'

import React, { Fragment } from 'react'
import { FileDiff, ReviewComment } from '@/lib/types'

interface DiffViewerProps {
  diffs: FileDiff[]
  comments: ReviewComment[]
  highlightedLine?: number
  onLineClick?: (lineNum: number) => void
}

const LANG_COLOR: Record<string, string> = {
  python: '#3572A5',
  javascript: '#f1e05a',
  typescript: '#3178c6',
  go: '#00ADD8',
}

export default function DiffViewer({ diffs, comments, highlightedLine, onLineClick }: DiffViewerProps) {
  const commentsByLine: Record<number, ReviewComment[]> = {}
  for (const c of comments) {
    if (c.line_number != null) {
      if (!commentsByLine[c.line_number]) commentsByLine[c.line_number] = []
      commentsByLine[c.line_number].push(c)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {diffs.map((diff) => (
        <div
          key={diff.filename}
          className="rounded border overflow-hidden"
          style={{ backgroundColor: '#0a0c0e', borderColor: '#1e2227' }}
        >
          {/* File header */}
          <div
            className="flex items-center gap-3 px-4 py-2 border-b text-sm"
            style={{ backgroundColor: '#131618', borderColor: '#1e2227' }}
          >
            <span
              className="font-mono text-xs px-1.5 py-0.5 rounded"
              style={{
                backgroundColor: LANG_COLOR[diff.language] || '#484f58',
                color: '#0d0f11',
                opacity: 0.9,
              }}
            >
              {diff.language}
            </span>
            <span className="font-mono text-sm" style={{ color: '#e6edf3' }}>
              {diff.filename}
            </span>
          </div>

          {/* Diff lines */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs font-mono">
              <tbody>
                {diff.lines.map((line, idx) => {
                  const lineNum = idx + 1
                  const isChanged = diff.changed_line_numbers.includes(lineNum)
                  const isHighlighted = lineNum === highlightedLine
                  const lineComments = commentsByLine[lineNum] || []

                  return (
                    <Fragment key={`${diff.filename}-${lineNum}`}>
                      <tr
                        style={{
                          backgroundColor: isHighlighted
                            ? 'rgba(121, 192, 255, 0.15)'
                            : isChanged
                            ? 'rgba(63, 185, 80, 0.06)'
                            : 'transparent',
                          cursor: onLineClick ? 'pointer' : 'default',
                        }}
                        onClick={() => onLineClick?.(lineNum)}
                        className="hover:bg-white/5 transition-colors group"
                      >
                        {/* Line number */}
                        <td
                          className="select-none text-right pr-3 pl-4 py-0.5 w-10 group-hover:text-white"
                          style={{
                            color: isHighlighted ? '#79c0ff' : '#484f58',
                            borderRight: '1px solid #1e2227',
                            userSelect: 'none',
                          }}
                        >
                          {lineNum}
                        </td>

                        {/* Change marker with left border */}
                        <td
                          className="w-5 px-1 py-0.5 text-center"
                          style={{
                            borderLeft: isChanged ? '2px solid #3fb950' : '2px solid transparent',
                            color: isChanged ? '#3fb950' : 'transparent',
                          }}
                        >
                          {isChanged ? '+' : ' '}
                        </td>

                        {/* Line content */}
                        <td
                          className="py-0.5 pl-2 pr-4 whitespace-pre"
                          style={{ color: isChanged ? '#79c0ff' : '#e6edf3' }}
                        >
                          {line}
                        </td>

                        {/* Comment badge */}
                        <td className="py-0.5 pr-4 text-right">
                          {lineComments.length > 0 && (
                            <span
                              className="text-xs px-1.5 py-0.5 rounded"
                              style={{ backgroundColor: '#1a1e23', color: '#7d8590' }}
                            >
                              💬 {lineComments.length}
                            </span>
                          )}
                        </td>
                      </tr>

                      {/* Comment callout bubbles */}
                      {lineComments.map((c, ci) => (
                        <tr key={`comment-${lineNum}-${ci}`}>
                          <td colSpan={4} style={{ backgroundColor: '#131618', padding: 0 }}>
                            <div
                              className="mx-4 my-1 px-3 py-2 rounded text-xs"
                              style={{
                                borderLeft: '2px solid #d29922',
                                backgroundColor: '#1a1e23',
                                color: '#e6edf3',
                              }}
                            >
                              <span style={{ color: '#d29922', marginRight: 8 }}>
                                [{c.action_type}]
                              </span>
                              {c.content}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  )
}
