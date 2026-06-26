'use client'

import { useCallback } from 'react'
import type { SubtitleSegment } from '@/lib/types'

interface TimelineProps {
  duration: number
  subtitles: SubtitleSegment[]
  currentTime: number
  onSeek: (time: number) => void
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

export default function Timeline({ duration, subtitles, currentTime, onSeek }: TimelineProps) {
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect()
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
      onSeek(ratio * duration)
    },
    [duration, onSeek]
  )

  const toPercent = (time: number) => (duration > 0 ? (time / duration) * 100 : 0)

  // Build tick marks at even intervals
  const tickInterval = duration <= 60 ? 10 : duration <= 300 ? 30 : 60
  const ticks: number[] = []
  for (let t = 0; t <= duration; t += tickInterval) {
    ticks.push(t)
  }

  const progress = toPercent(currentTime)

  return (
    <div className="px-3 py-2 bg-gray-900 select-none">
      <div className="text-xs text-gray-500 mb-1 font-medium">時間軸</div>

      {/* Tick labels */}
      <div className="relative h-4 mb-0.5">
        {ticks.map((t) => (
          <span
            key={t}
            className="absolute text-gray-600 text-xs transform -translate-x-1/2"
            style={{ left: `${toPercent(t)}%` }}
          >
            {formatTime(t)}
          </span>
        ))}
      </div>

      {/* Main track */}
      <div
        className="relative h-8 cursor-crosshair rounded overflow-hidden bg-gray-800"
        onClick={handleClick}
      >
        {/* Subtitle segments */}
        {subtitles.map((seg) => {
          const left = toPercent(seg.startTime)
          const width = toPercent(seg.endTime) - left
          return (
            <div
              key={seg.id}
              className={`absolute top-1 bottom-1 rounded-sm transition-colors ${
                seg.deleted ? 'bg-red-600/70' : 'bg-green-600/70'
              }`}
              style={{ left: `${left}%`, width: `${Math.max(width, 0.3)}%` }}
              title={seg.deleted ? `[刪除] ${seg.text}` : seg.text}
            />
          )
        })}

        {/* Playhead */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_4px_rgba(255,255,255,0.8)] pointer-events-none z-10"
          style={{ left: `${progress}%` }}
        />

        {/* Time tooltip */}
        <div
          className="absolute top-0 h-full flex items-center pointer-events-none"
          style={{ left: `${progress}%` }}
        >
          <div
            className="absolute -top-6 left-0 -translate-x-1/2 text-xs bg-gray-700 text-white px-1.5 py-0.5 rounded whitespace-nowrap"
          >
            {formatTime(currentTime)}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 mt-1.5">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-2 rounded-sm bg-green-600/70" />
          <span className="text-gray-600 text-xs">保留</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-2 rounded-sm bg-red-600/70" />
          <span className="text-gray-600 text-xs">刪除</span>
        </div>
      </div>
    </div>
  )
}
