'use client'

import { useState, useRef, useEffect } from 'react'
import { Trash2, Image, Check, X } from 'lucide-react'
import type { SubtitleSegment } from '@/lib/types'

interface SubtitleEditorProps {
  subtitles: SubtitleSegment[]
  selectedId: string | null
  onUpdate: (updated: SubtitleSegment) => void
  onDelete: (id: string) => void
  onSelectForBroll: (subtitle: SubtitleSegment) => void
  onSelect: (id: string) => void
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  const ms = Math.round((s - Math.floor(s)) * 10)
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${ms}`
}

function parseTime(str: string): number | null {
  // Accept mm:ss.d or mm:ss or ss
  const parts = str.match(/^(\d+):(\d+)(?:\.(\d+))?$/)
  if (!parts) {
    const secOnly = parseFloat(str)
    if (!isNaN(secOnly)) return secOnly
    return null
  }
  const m = parseInt(parts[1])
  const s = parseInt(parts[2])
  const frac = parts[3] ? parseFloat(`0.${parts[3]}`) : 0
  return m * 60 + s + frac
}

interface TimeEditProps {
  value: number
  onCommit: (v: number) => void
}

function TimeEdit({ value, onCommit }: TimeEditProps) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(formatTime(value))
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!editing) setText(formatTime(value))
  }, [value, editing])

  const commit = () => {
    const parsed = parseTime(text)
    if (parsed !== null && parsed >= 0) onCommit(parsed)
    else setText(formatTime(value))
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') { setText(formatTime(value)); setEditing(false) }
        }}
        className="w-20 bg-gray-900 border border-indigo-500 rounded px-1 py-0 text-xs text-indigo-300 font-mono outline-none"
        autoFocus
      />
    )
  }

  return (
    <span
      className="text-xs text-gray-500 font-mono cursor-pointer hover:text-indigo-400 transition-colors"
      onClick={() => setEditing(true)}
      title="點擊編輯時間點"
    >
      {formatTime(value)}
    </span>
  )
}

export default function SubtitleEditor({
  subtitles,
  selectedId,
  onUpdate,
  onDelete,
  onSelectForBroll,
  onSelect,
}: SubtitleEditorProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const selectedRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (selectedId && selectedRef.current) {
      selectedRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [selectedId])

  const startEdit = (seg: SubtitleSegment) => {
    setEditingId(seg.id)
    setEditText(seg.text)
  }

  const commitEdit = (seg: SubtitleSegment) => {
    onUpdate({ ...seg, text: editText.trim() || seg.text })
    setEditingId(null)
  }

  const cancelEdit = () => {
    setEditingId(null)
  }

  const keptCount = subtitles.filter((s) => !s.deleted).length
  const deletedCount = subtitles.filter((s) => s.deleted).length

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-gray-700 flex items-center justify-between bg-gray-800/50">
        <h2 className="text-sm font-semibold text-white">字幕編輯器</h2>
        <div className="flex gap-3 text-xs text-gray-500">
          <span className="text-green-400">{keptCount} 保留</span>
          <span className="text-red-400">{deletedCount} 刪除</span>
        </div>
      </div>

      {/* Subtitle list */}
      <div className="flex-1 overflow-y-auto divide-y divide-gray-800">
        {subtitles.length === 0 ? (
          <div className="p-8 text-center text-gray-600">
            <p>尚無字幕</p>
          </div>
        ) : (
          subtitles.map((seg) => {
            const isSelected = seg.id === selectedId
            const isEditing = seg.id === editingId

            return (
              <div
                key={seg.id}
                ref={isSelected ? selectedRef as React.RefObject<HTMLDivElement> : undefined}
                className={`group flex flex-col gap-1.5 px-3 py-2.5 cursor-pointer transition-colors ${
                  seg.deleted
                    ? 'bg-red-900/20 hover:bg-red-900/30'
                    : isSelected
                    ? 'bg-indigo-900/30'
                    : 'hover:bg-gray-800/60'
                }`}
                onClick={() => {
                  if (!isEditing) onSelect(seg.id)
                }}
              >
                {/* Time range row */}
                <div className="flex items-center gap-1.5">
                  <TimeEdit
                    value={seg.startTime}
                    onCommit={(v) => onUpdate({ ...seg, startTime: v })}
                  />
                  <span className="text-gray-700 text-xs">→</span>
                  <TimeEdit
                    value={seg.endTime}
                    onCommit={(v) => onUpdate({ ...seg, endTime: v })}
                  />
                  {isSelected && (
                    <span className="ml-auto text-indigo-400 text-xs">▶</span>
                  )}
                  {seg.brollImageUrl && (
                    <span className="text-yellow-400 text-xs ml-auto">🎨 B-roll</span>
                  )}
                </div>

                {/* Text row */}
                <div className="flex items-start gap-2">
                  {isEditing ? (
                    <div className="flex-1 flex items-start gap-1">
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            commitEdit(seg)
                          }
                          if (e.key === 'Escape') cancelEdit()
                        }}
                        className="flex-1 bg-gray-900 border border-indigo-500 rounded px-2 py-1 text-sm text-white outline-none resize-none min-h-[2.5rem]"
                        autoFocus
                        rows={2}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <button
                        onClick={(e) => { e.stopPropagation(); commitEdit(seg) }}
                        className="p-1 text-green-400 hover:text-green-300 mt-0.5"
                        title="儲存"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); cancelEdit() }}
                        className="p-1 text-gray-500 hover:text-gray-300 mt-0.5"
                        title="取消"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <p
                        className={`flex-1 text-sm leading-snug cursor-text select-text ${
                          seg.deleted ? 'line-through text-gray-500' : 'text-white'
                        }`}
                        onDoubleClick={(e) => { e.stopPropagation(); startEdit(seg) }}
                        title="雙擊編輯"
                      >
                        {seg.text || <span className="text-gray-600 italic">（空白）</span>}
                      </p>

                      {/* Action buttons - visible on hover or when selected */}
                      <div className={`flex items-center gap-1 shrink-0 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                        {/* B-roll */}
                        {!seg.deleted && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onSelectForBroll(seg) }}
                            className="p-1.5 rounded text-gray-400 hover:text-yellow-400 hover:bg-yellow-900/30 transition-colors"
                            title="AI畫面 (B-roll)"
                          >
                            <Image className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {/* Delete/restore */}
                        <button
                          onClick={(e) => { e.stopPropagation(); onDelete(seg.id) }}
                          className={`p-1.5 rounded transition-colors ${
                            seg.deleted
                              ? 'text-gray-500 hover:text-green-400 hover:bg-green-900/30'
                              : 'text-gray-400 hover:text-red-400 hover:bg-red-900/30'
                          }`}
                          title={seg.deleted ? '恢復片段' : '刪除片段'}
                        >
                          {seg.deleted ? (
                            <Check className="w-3.5 h-3.5" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* B-roll image preview */}
                {seg.brollImageUrl && !seg.deleted && (
                  <div className="mt-1">
                    <img
                      src={seg.brollImageUrl}
                      alt="B-roll"
                      className="w-full h-16 object-cover rounded border border-gray-700"
                    />
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
