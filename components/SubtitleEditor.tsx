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
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

function parseTime(str: string): number | null {
  const parts = str.match(/^(\d+):(\d+)(?:\.(\d+))?$/)
  if (!parts) {
    const secOnly = parseFloat(str)
    return isNaN(secOnly) ? null : secOnly
  }
  const frac = parts[3] ? parseFloat(`0.${parts[3]}`) : 0
  return parseInt(parts[1]) * 60 + parseInt(parts[2]) + frac
}

function TimeEdit({ value, onCommit }: { value: number; onCommit: (v: number) => void }) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(formatTime(value))

  useEffect(() => { if (!editing) setText(formatTime(value)) }, [value, editing])

  const commit = () => {
    const parsed = parseTime(text)
    if (parsed !== null && parsed >= 0) onCommit(parsed)
    else setText(formatTime(value))
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') { setText(formatTime(value)); setEditing(false) }
        }}
        onClick={(e) => e.stopPropagation()}
        className="w-14 bg-gray-900 border border-indigo-500 rounded px-1 text-xs text-indigo-300 font-mono outline-none"
        autoFocus
      />
    )
  }

  return (
    <span
      className="text-xs text-gray-500 font-mono cursor-pointer hover:text-indigo-400 transition-colors"
      onClick={(e) => { e.stopPropagation(); setEditing(true) }}
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
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (selectedId && selectedRef.current) {
      selectedRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
    }
  }, [selectedId])

  const startEdit = (seg: SubtitleSegment) => { setEditingId(seg.id); setEditText(seg.text) }
  const commitEdit = (seg: SubtitleSegment) => {
    onUpdate({ ...seg, text: editText.trim() || seg.text })
    setEditingId(null)
  }

  const keptCount = subtitles.filter((s) => !s.deleted).length
  const deletedCount = subtitles.filter((s) => s.deleted).length

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="px-3 py-2 border-b border-gray-700 flex items-center justify-between bg-gray-800/60 shrink-0">
        <h2 className="text-xs font-semibold text-gray-300 uppercase tracking-wider">字幕編輯器</h2>
        <div className="flex gap-3 text-xs">
          <span className="text-green-400">{keptCount} 保留</span>
          <span className="text-red-400">{deletedCount} 刪除</span>
        </div>
      </div>

      {/* Horizontal card scroll */}
      <div
        ref={scrollRef}
        className="flex overflow-x-auto gap-2 px-3 py-2.5 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {subtitles.length === 0 ? (
          <div className="py-4 px-6 text-gray-600 text-sm whitespace-nowrap">尚無字幕</div>
        ) : (
          subtitles.map((seg) => {
            const isSelected = seg.id === selectedId
            const isEditing = seg.id === editingId

            return (
              <div
                key={seg.id}
                ref={isSelected ? (selectedRef as React.RefObject<HTMLDivElement>) : undefined}
                onClick={() => { if (!isEditing) onSelect(seg.id) }}
                className={`flex flex-col gap-2 w-40 shrink-0 rounded-xl border p-2.5 cursor-pointer transition-all ${
                  seg.deleted
                    ? 'border-red-800 bg-red-950/40'
                    : isSelected
                    ? 'border-indigo-500 bg-indigo-950/50 shadow-lg shadow-indigo-900/30'
                    : 'border-gray-700 bg-gray-800 hover:border-gray-500'
                }`}
              >
                {/* Time range */}
                <div className="flex items-center gap-1 shrink-0">
                  <TimeEdit value={seg.startTime} onCommit={(v) => onUpdate({ ...seg, startTime: v })} />
                  <span className="text-gray-700 text-xs">-</span>
                  <TimeEdit value={seg.endTime} onCommit={(v) => onUpdate({ ...seg, endTime: v })} />
                </div>

                {/* Text */}
                {isEditing ? (
                  <div className="flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitEdit(seg) }
                        if (e.key === 'Escape') setEditingId(null)
                      }}
                      className="w-full bg-gray-900 border border-indigo-500 rounded px-2 py-1 text-xs text-white outline-none resize-none"
                      autoFocus
                      rows={3}
                    />
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => commitEdit(seg)} className="p-1 text-green-400 hover:text-green-300">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setEditingId(null)} className="p-1 text-gray-500 hover:text-gray-300">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <p
                    className={`text-xs leading-snug flex-1 ${
                      seg.deleted ? 'line-through text-gray-500' : 'text-white'
                    }`}
                    onDoubleClick={(e) => { e.stopPropagation(); startEdit(seg) }}
                    title="雙擊編輯文字"
                  >
                    {seg.text || <span className="text-gray-600 italic">（空白）</span>}
                  </p>
                )}

                {/* B-roll thumbnail */}
                {seg.brollImageUrl && !seg.deleted && (
                  <img
                    src={seg.brollImageUrl}
                    alt="B-roll"
                    className="w-full h-12 object-cover rounded-md border border-gray-700"
                  />
                )}

                {/* Action buttons */}
                {!isEditing && (
                  <div className="flex items-center justify-between gap-1 pt-0.5 border-t border-gray-700/50">
                    {!seg.deleted ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); onSelectForBroll(seg) }}
                        className="flex items-center gap-1 px-1.5 py-1 rounded text-xs text-yellow-500 hover:bg-yellow-900/30 transition-colors"
                        title="AI 畫面"
                      >
                        <Image className="w-3 h-3" />
                        <span>AI</span>
                      </button>
                    ) : (
                      <span />
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); onDelete(seg.id) }}
                      className={`flex items-center gap-1 px-1.5 py-1 rounded text-xs transition-colors ${
                        seg.deleted
                          ? 'text-green-400 hover:bg-green-900/30'
                          : 'text-red-400 hover:bg-red-900/30'
                      }`}
                      title={seg.deleted ? '恢復' : '刪除'}
                    >
                      {seg.deleted ? <Check className="w-3 h-3" /> : <Trash2 className="w-3 h-3" />}
                      <span>{seg.deleted ? '恢復' : '刪除'}</span>
                    </button>
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
