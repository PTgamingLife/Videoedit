'use client'

import { useState, useCallback, useRef } from 'react'
import { Upload, Film, AlertCircle } from 'lucide-react'

interface VideoUploadProps {
  onFileSelected: (file: File) => void
}

const ACCEPTED_TYPES = ['video/mp4', 'video/quicktime', 'video/webm']
const MAX_SIZE_MB = 500
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function VideoUpload({ onFileSelected }: VideoUploadProps) {
  const [dragOver, setDragOver] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return `不支援的格式：${file.type || '未知'}。請上傳 MP4、MOV 或 WebM。`
    }
    if (file.size > MAX_SIZE_BYTES) {
      return `檔案過大（${formatSize(file.size)}）。上限為 ${MAX_SIZE_MB} MB。`
    }
    return null
  }

  const handleFile = (file: File) => {
    const err = validateFile(file)
    if (err) {
      setError(err)
      setSelectedFile(null)
      return
    }
    setError(null)
    setSelectedFile(file)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragOver(false)
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  const handleStart = () => {
    if (selectedFile) onFileSelected(selectedFile)
  }

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-6">
      {/* Title */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-2">VideoEdit Pro</h1>
        <p className="text-gray-400">上傳口播影片，自動生成繁體中文字幕並智慧剪輯</p>
      </div>

      {/* Drop zone */}
      <div
        className={`relative border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-200 ${
          dragOver
            ? 'border-indigo-400 bg-indigo-900/20'
            : 'border-gray-600 hover:border-gray-500 hover:bg-gray-800/50'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept="video/mp4,video/quicktime,video/webm"
          className="hidden"
          onChange={handleInputChange}
        />

        {selectedFile ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-indigo-900/50 flex items-center justify-center">
              <Film className="w-8 h-8 text-indigo-400" />
            </div>
            <div>
              <p className="text-white font-semibold text-lg">{selectedFile.name}</p>
              <p className="text-gray-400 text-sm mt-1">
                {formatSize(selectedFile.size)} ·{' '}
                {selectedFile.type.split('/')[1].toUpperCase()}
              </p>
            </div>
            <p className="text-gray-500 text-xs">點擊重新選擇</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${
                dragOver ? 'bg-indigo-600' : 'bg-gray-700'
              }`}
            >
              <Upload className={`w-8 h-8 ${dragOver ? 'text-white' : 'text-gray-400'}`} />
            </div>
            <div>
              <p className="text-white font-medium">拖放影片至此，或點擊選擇</p>
              <p className="text-gray-500 text-sm mt-1">
                支援 MP4、MOV、WebM · 最大 {MAX_SIZE_MB} MB
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-900/30 border border-red-700 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      {/* Feature list */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: '🎙️', label: 'Whisper 語音轉錄', desc: '自動生成繁體中文字幕' },
          { icon: '✂️', label: '智慧剪輯', desc: '刪除字幕即刪除片段' },
          { icon: '🎨', label: 'AI B-roll', desc: 'DALL-E 3 自動配圖' },
        ].map((f) => (
          <div key={f.label} className="p-3 bg-gray-800 rounded-lg text-center">
            <div className="text-2xl mb-1">{f.icon}</div>
            <p className="text-white text-xs font-medium">{f.label}</p>
            <p className="text-gray-500 text-xs mt-0.5">{f.desc}</p>
          </div>
        ))}
      </div>

      {/* Start button */}
      <button
        disabled={!selectedFile}
        onClick={handleStart}
        className={`w-full py-3.5 rounded-xl font-semibold text-base transition-all ${
          selectedFile
            ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/40'
            : 'bg-gray-700 text-gray-500 cursor-not-allowed'
        }`}
      >
        {selectedFile ? '開始分析' : '請先選擇影片'}
      </button>
    </div>
  )
}
