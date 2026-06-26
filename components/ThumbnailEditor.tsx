'use client'

import { useState } from 'react'
import { Image, Sparkles, Download, X, RefreshCw } from 'lucide-react'
import { extractFrame } from '@/lib/ffmpeg-utils'
import { generateThumbnail } from '@/lib/supabase'

interface Props {
  videoFile: File
  currentTime: number
  onThumbnailGenerated: (url: string) => void
  onClose: () => void
}

export default function ThumbnailEditor({ videoFile, currentTime, onThumbnailGenerated, onClose }: Props) {
  const [frameBase64, setFrameBase64] = useState<string | null>(null)
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null)
  const [prompt, setPrompt] = useState('')
  const [extracting, setExtracting] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleExtractFrame = async () => {
    setExtracting(true)
    setError(null)
    try {
      const base64 = await extractFrame(videoFile, currentTime)
      setFrameBase64(base64)
    } catch (err) {
      setError(err instanceof Error ? err.message : '擷取影格失敗')
    } finally {
      setExtracting(false)
    }
  }

  const handleGenerateThumbnail = async () => {
    setGenerating(true)
    setError(null)
    try {
      const finalPrompt = prompt.trim() || '吸睛的短影片封面，專業人像，高對比度'
      const url = await generateThumbnail(finalPrompt, frameBase64 ?? undefined)
      setThumbnailUrl(url)
      onThumbnailGenerated(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : '封面生成失敗')
    } finally {
      setGenerating(false)
    }
  }

  const handleDownload = () => {
    if (!thumbnailUrl) return
    const a = document.createElement('a')
    a.href = thumbnailUrl
    a.download = 'thumbnail.png'
    a.target = '_blank'
    a.click()
  }

  return (
    <div className="flex h-full bg-gray-900">
      {/* Left controls */}
      <div className="w-80 shrink-0 flex flex-col p-4 border-r border-gray-700 gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm">
            <Image className="w-4 h-4" />
            封面產生器
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={handleExtractFrame}
            disabled={extracting}
            className="flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium disabled:opacity-50"
          >
            {extracting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Image className="w-4 h-4" />}
            {extracting ? '擷取中…' : '擷取目前影格'}
          </button>

          <div>
            <label className="text-xs text-gray-500 block mb-1">封面描述（選填）</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="例：專業主播風格，黑色背景，標題文字留白區"
              rows={3}
              className="w-full text-sm bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 outline-none focus:border-indigo-500 resize-none placeholder-gray-600"
            />
          </div>

          <button
            onClick={handleGenerateThumbnail}
            disabled={generating}
            className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold disabled:opacity-50"
          >
            {generating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {generating ? 'AI 生成中…' : 'AI 生成封面'}
          </button>

          {thumbnailUrl && (
            <button
              onClick={handleDownload}
              className="flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-green-700 hover:bg-green-600 text-white text-sm font-medium"
            >
              <Download className="w-4 h-4" />
              下載封面
            </button>
          )}
        </div>

        {error && (
          <div className="p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-400 text-xs">
            {error}
          </div>
        )}
      </div>

      {/* Right: preview */}
      <div className="flex-1 flex items-center justify-center bg-gray-950 p-4 gap-4">
        {frameBase64 && (
          <div className="flex flex-col items-center gap-2">
            <p className="text-xs text-gray-500">原始影格</p>
            <img src={frameBase64} alt="video frame" className="max-h-48 rounded-lg shadow-lg" />
          </div>
        )}
        {thumbnailUrl ? (
          <div className="flex flex-col items-center gap-2">
            <p className="text-xs text-gray-500">AI 生成封面</p>
            <img src={thumbnailUrl} alt="AI thumbnail" className="max-h-48 rounded-lg shadow-2xl ring-2 ring-indigo-500" />
          </div>
        ) : !frameBase64 && !generating && (
          <div className="text-gray-700 text-sm text-center">
            <Image className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>先擷取影格，再生成 AI 封面</p>
          </div>
        )}
        {generating && (
          <div className="flex flex-col items-center gap-3 text-gray-500">
            <div className="w-10 h-10 rounded-full border-4 border-gray-700 border-t-indigo-500 animate-spin" />
            <p className="text-sm">DALL-E 3 HD 生成中…</p>
          </div>
        )}
      </div>
    </div>
  )
}
