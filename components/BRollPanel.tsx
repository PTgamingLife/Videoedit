'use client'

import { useState } from 'react'
import { X, Wand2, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import type { SubtitleSegment } from '@/lib/types'
import { generateBrollImage } from '@/lib/supabase'

interface BRollPanelProps {
  selectedSubtitle: SubtitleSegment
  onImageGenerated: (subtitleId: string, imageUrl: string) => void
  onClose: () => void
}

export default function BRollPanel({
  selectedSubtitle,
  onImageGenerated,
  onClose,
}: BRollPanelProps) {
  const [customPrompt, setCustomPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    selectedSubtitle.brollImageUrl ?? null
  )
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = async () => {
    setLoading(true)
    setError(null)
    try {
      const prompt = customPrompt.trim() || '相關場景畫面'
      const imageUrl = await generateBrollImage(prompt, selectedSubtitle.text)
      setPreviewUrl(imageUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成失敗')
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = () => {
    if (previewUrl) {
      onImageGenerated(selectedSubtitle.id, previewUrl)
      onClose()
    }
  }

  const handleReject = () => {
    setPreviewUrl(null)
  }

  return (
    <div className="h-full flex bg-gray-800/50">
      {/* Left: Info + Controls */}
      <div className="flex flex-col gap-3 p-4 w-80 shrink-0 border-r border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-yellow-400" />
            AI 畫面 (B-roll)
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Context display */}
        <div className="p-2.5 bg-gray-900 rounded-lg">
          <p className="text-xs text-gray-500 mb-1">字幕文字（作為上下文）</p>
          <p className="text-sm text-gray-300 leading-snug">{selectedSubtitle.text}</p>
        </div>

        {/* Custom prompt */}
        <div>
          <label className="text-xs text-gray-500 block mb-1">自訂畫面描述（選填）</label>
          <textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="例如：城市夜景、咖啡廳場景、自然風景…"
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-indigo-500 resize-none"
            rows={3}
          />
        </div>

        {/* Error */}
        {error && (
          <p className="text-red-400 text-xs bg-red-900/30 px-3 py-2 rounded">{error}</p>
        )}

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="flex items-center justify-center gap-2 py-2.5 bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-medium rounded-lg text-sm transition-colors"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              生成中…
            </>
          ) : (
            <>
              <Wand2 className="w-4 h-4" />
              生成 AI 畫面
            </>
          )}
        </button>
      </div>

      {/* Right: Preview */}
      <div className="flex-1 p-4 flex flex-col gap-3">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-10 h-10 text-yellow-400 animate-spin mx-auto mb-3" />
              <p className="text-gray-400 text-sm">DALL-E 3 生成中，請稍候…</p>
            </div>
          </div>
        ) : previewUrl ? (
          <div className="flex flex-col gap-3 flex-1">
            <div className="flex-1 overflow-hidden rounded-lg border border-gray-700">
              <img
                src={previewUrl}
                alt="Generated B-roll"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAccept}
                className="flex-1 flex items-center justify-center gap-2 py-2 bg-green-700 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <CheckCircle className="w-4 h-4" />
                套用
              </button>
              <button
                onClick={handleReject}
                className="flex-1 flex items-center justify-center gap-2 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <XCircle className="w-4 h-4" />
                重新生成
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center border-2 border-dashed border-gray-700 rounded-lg">
            <div className="text-center text-gray-600">
              <Wand2 className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">點擊「生成 AI 畫面」</p>
              <p className="text-xs mt-1 text-gray-700">將以字幕文字為基礎生成 16:9 畫面</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
