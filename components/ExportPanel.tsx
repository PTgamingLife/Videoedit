'use client'

import { useState } from 'react'
import { Download, X, Film, Scissors } from 'lucide-react'
import type { SubtitleSegment, SubtitleStyle } from '@/lib/types'
import { exportVideo } from '@/lib/ffmpeg-utils'

interface Props {
  videoFile: File
  subtitles: SubtitleSegment[]
  style: SubtitleStyle
  duration: number
  onClose: () => void
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

export default function ExportPanel({ videoFile, subtitles, style, duration, onClose }: Props) {
  const [exporting, setExporting] = useState(false)
  const [progress, setProgress] = useState<{ phase: string; percent: number } | null>(null)
  const [outputUrl, setOutputUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const kept = subtitles.filter((s) => !s.deleted)
  const deleted = subtitles.filter((s) => s.deleted)
  const keptDuration = kept.reduce((sum, s) => sum + (s.endTime - s.startTime), 0)
  const brollCount = kept.filter((s) => s.brollImageUrl).length

  const colorPresetLabels: Record<SubtitleStyle['colorPreset'], string> = {
    'white-black-stroke': '白字黑邊',
    'yellow-black-stroke': '黃字黑邊',
    'white-black-box': '白字黑底',
  }
  const posLabels: Record<SubtitleStyle['verticalPosition'], string> = {
    top: '上方',
    center: '中央',
    bottom: '下方',
  }

  const handleExport = async () => {
    setExporting(true)
    setError(null)
    setOutputUrl(null)
    try {
      const blob = await exportVideo(videoFile, subtitles, style, (phase, percent) => {
        setProgress({ phase, percent })
      })
      const url = URL.createObjectURL(blob)
      setOutputUrl(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : '匯出失敗')
    } finally {
      setExporting(false)
      setProgress(null)
    }
  }

  const handleDownload = () => {
    if (!outputUrl) return
    const a = document.createElement('a')
    a.href = outputUrl
    a.download = `edited_${videoFile.name}`
    a.click()
  }

  return (
    <div className="flex h-full bg-gray-900">
      {/* Left: summary */}
      <div className="w-80 shrink-0 flex flex-col p-4 border-r border-gray-700 gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm">
            <Film className="w-4 h-4" />
            匯出影片
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: '原始時長', value: formatTime(duration) },
            { label: '剪輯後', value: formatTime(keptDuration) },
            { label: '保留片段', value: `${kept.length} 段` },
            { label: '刪除片段', value: `${deleted.length} 段` },
            { label: 'B-roll 畫面', value: `${brollCount} 張` },
            { label: '字幕位置', value: posLabels[style.verticalPosition] },
          ].map((item) => (
            <div key={item.label} className="p-2 bg-gray-800 rounded-lg">
              <p className="text-xs text-gray-500">{item.label}</p>
              <p className="text-sm text-white font-semibold mt-0.5">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-800 rounded-lg px-3 py-2">
          <Scissors className="w-3.5 h-3.5" />
          字幕樣式：{colorPresetLabels[style.colorPreset]}
        </div>

        {error && (
          <div className="p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-400 text-xs">
            {error}
          </div>
        )}

        <div className="mt-auto flex flex-col gap-2">
          {!outputUrl ? (
            <button
              onClick={handleExport}
              disabled={exporting || kept.length === 0}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exporting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {progress?.phase ?? '處理中…'}
                </>
              ) : (
                <>
                  <Film className="w-4 h-4" />
                  開始匯出
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleDownload}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-green-700 hover:bg-green-600 text-white font-semibold"
            >
              <Download className="w-4 h-4" />
              下載影片
            </button>
          )}
        </div>
      </div>

      {/* Right: progress/result */}
      <div className="flex-1 flex items-center justify-center bg-gray-950 p-8">
        {exporting && progress && (
          <div className="w-full max-w-sm flex flex-col gap-4">
            <p className="text-white text-sm text-center font-medium">{progress.phase}</p>
            <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 transition-all duration-300 progress-pulse"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
            <p className="text-gray-500 text-xs text-center">
              影片處理在瀏覽器中執行，請勿關閉頁面
            </p>
          </div>
        )}
        {outputUrl && !exporting && (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-green-900/50 flex items-center justify-center">
              <Download className="w-8 h-8 text-green-400" />
            </div>
            <div>
              <p className="text-white font-semibold">影片匯出完成！</p>
              <p className="text-gray-500 text-sm mt-1">點擊左側下載按鈕儲存影片</p>
            </div>
            <video
              src={outputUrl}
              controls
              className="max-w-full rounded-lg shadow-2xl max-h-40"
            />
          </div>
        )}
        {!exporting && !outputUrl && (
          <div className="text-gray-700 text-sm text-center">
            <Film className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>點擊「開始匯出」進行剪輯與字幕燒錄</p>
            <p className="text-xs mt-1 text-gray-600">使用 FFmpeg.wasm 在瀏覽器中處理</p>
          </div>
        )}
      </div>
    </div>
  )
}
