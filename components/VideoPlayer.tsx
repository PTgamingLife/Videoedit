'use client'

import { useRef, useEffect, useCallback, MutableRefObject } from 'react'
import type { SubtitleSegment, SubtitleStyle } from '@/lib/types'

interface VideoPlayerProps {
  videoUrl: string
  currentTime: number
  duration: number
  subtitles: SubtitleSegment[]
  style: SubtitleStyle
  onTimeUpdate: (time: number) => void
  seekRef: MutableRefObject<(time: number) => void>
}

function getSubtitleTextStyle(preset: SubtitleStyle['colorPreset']): React.CSSProperties {
  switch (preset) {
    case 'white-black-stroke':
      return {
        color: '#ffffff',
        textShadow:
          '-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000, 0 0 6px #000',
        background: 'none',
        padding: '0',
      }
    case 'yellow-black-stroke':
      return {
        color: '#FFE000',
        textShadow:
          '-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000, 0 0 6px #000',
        background: 'none',
        padding: '0',
      }
    case 'white-black-box':
      return {
        color: '#ffffff',
        background: 'rgba(0,0,0,0.75)',
        padding: '4px 12px',
        borderRadius: '4px',
        textShadow: 'none',
      }
    default:
      return { color: '#ffffff' }
  }
}

function getVerticalPositionStyle(pos: SubtitleStyle['verticalPosition']): React.CSSProperties {
  switch (pos) {
    case 'top':
      return { top: '8%', bottom: 'auto', transform: 'none' }
    case 'center':
      return { top: '50%', bottom: 'auto', transform: 'translateY(-50%)' }
    case 'bottom':
    default:
      return { bottom: '8%', top: 'auto', transform: 'none' }
  }
}

export default function VideoPlayer({
  videoUrl,
  currentTime,
  duration,
  subtitles,
  style,
  onTimeUpdate,
  seekRef,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const isSeekingRef = useRef(false)

  // Wire the seekRef so parent can imperatively seek
  useEffect(() => {
    seekRef.current = (time: number) => {
      if (videoRef.current) {
        videoRef.current.currentTime = time
      }
    }
  }, [seekRef])

  const handleTimeUpdate = useCallback(() => {
    if (!isSeekingRef.current && videoRef.current) {
      onTimeUpdate(videoRef.current.currentTime)
    }
  }, [onTimeUpdate])

  const handleScrubberClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect()
      const ratio = (e.clientX - rect.left) / rect.width
      const newTime = ratio * duration
      if (videoRef.current) {
        videoRef.current.currentTime = newTime
        onTimeUpdate(newTime)
      }
    },
    [duration, onTimeUpdate]
  )

  // Find active subtitle
  const activeSubtitle = subtitles.find(
    (s) => !s.deleted && s.startTime <= currentTime && s.endTime >= currentTime
  )

  // Compute deleted segment markers as percentages
  const deletedMarkers = subtitles
    .filter((s) => s.deleted && duration > 0)
    .map((s) => ({
      left: (s.startTime / duration) * 100,
      width: ((s.endTime - s.startTime) / duration) * 100,
    }))

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="flex flex-col h-full bg-black">
      {/* Video wrapper */}
      <div className="relative flex-1 flex items-center justify-center bg-black overflow-hidden">
        <video
          ref={videoRef}
          src={videoUrl}
          className="max-h-full max-w-full object-contain"
          onTimeUpdate={handleTimeUpdate}
          onSeeking={() => { isSeekingRef.current = true }}
          onSeeked={() => {
            isSeekingRef.current = false
            if (videoRef.current) onTimeUpdate(videoRef.current.currentTime)
          }}
          controls={false}
          onClick={() => {
            if (videoRef.current) {
              if (videoRef.current.paused) {
                videoRef.current.play()
              } else {
                videoRef.current.pause()
              }
            }
          }}
        />

        {/* Subtitle overlay */}
        {activeSubtitle && (
          <div
            className="absolute left-0 right-0 flex justify-center pointer-events-none px-4"
            style={getVerticalPositionStyle(style.verticalPosition)}
          >
            <span
              className="text-center font-tc font-semibold leading-tight"
              style={{
                fontSize: 'clamp(14px, 2.5vw, 28px)',
                maxWidth: '90%',
                display: 'inline-block',
                ...getSubtitleTextStyle(style.colorPreset),
              }}
            >
              {activeSubtitle.text}
            </span>
          </div>
        )}

        {/* Play/pause hint */}
        <div className="absolute top-2 right-2 opacity-40 text-white text-xs pointer-events-none">
          點擊播放/暫停
        </div>
      </div>

      {/* Scrubber */}
      <div className="px-3 pb-2 pt-1 bg-gray-900">
        <div
          className="relative h-5 cursor-pointer group"
          onClick={handleScrubberClick}
        >
          {/* Track */}
          <div className="absolute top-1/2 left-0 right-0 h-1.5 -translate-y-1/2 bg-gray-700 rounded-full overflow-hidden">
            {/* Progress */}
            <div
              className="h-full bg-indigo-500"
              style={{ width: `${progress}%` }}
            />
            {/* Deleted segments overlay */}
            {deletedMarkers.map((m, i) => (
              <div
                key={i}
                className="absolute top-0 h-full bg-red-600/70"
                style={{ left: `${m.left}%`, width: `${m.width}%` }}
              />
            ))}
          </div>

          {/* Playhead */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow group-hover:scale-125 transition-transform"
            style={{ left: `calc(${progress}% - 6px)` }}
          />
        </div>

        {/* Time display */}
        <div className="flex justify-between text-gray-500 text-xs mt-0.5 select-none">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  )
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}
