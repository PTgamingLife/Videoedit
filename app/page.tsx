'use client'

import { useState, useCallback, useRef } from 'react'
import type { EditorState, SubtitleSegment, SubtitleStyle } from '@/lib/types'
import { transcribeAudio } from '@/lib/supabase'
import { extractAudio } from '@/lib/ffmpeg-utils'

import VideoUpload from '@/components/VideoUpload'
import VideoPlayer from '@/components/VideoPlayer'
import SubtitleEditor from '@/components/SubtitleEditor'
import StylePanel from '@/components/StylePanel'
import Timeline from '@/components/Timeline'
import BRollPanel from '@/components/BRollPanel'
import ThumbnailEditor from '@/components/ThumbnailEditor'
import ExportPanel from '@/components/ExportPanel'

type Phase = 'upload' | 'processing' | 'editor'
type MobileTab = 'subtitles' | 'style'

const defaultStyle: SubtitleStyle = {
  colorPreset: 'white-black-stroke',
  verticalPosition: 'bottom',
}

const defaultEditorState: EditorState = {
  videoFile: null,
  videoUrl: null,
  duration: 0,
  subtitles: [],
  style: defaultStyle,
  thumbnailUrl: null,
}

export default function HomePage() {
  const [phase, setPhase] = useState<Phase>('upload')
  const [editorState, setEditorState] = useState<EditorState>(defaultEditorState)
  const [processingStatus, setProcessingStatus] = useState('')
  const [processingError, setProcessingError] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [selectedSubtitleId, setSelectedSubtitleId] = useState<string | null>(null)
  const [brollSubtitle, setBrollSubtitle] = useState<SubtitleSegment | null>(null)
  const [activeBottomPanel, setActiveBottomPanel] = useState<'broll' | 'thumbnail' | 'export' | null>(null)
  const [mobileTab, setMobileTab] = useState<MobileTab>('subtitles')
  const videoSeekRef = useRef<(time: number) => void>(() => {})

  const handleFileSelected = useCallback(async (file: File) => {
    const videoUrl = URL.createObjectURL(file)
    const duration = await new Promise<number>((resolve) => {
      const vid = document.createElement('video')
      vid.preload = 'metadata'
      vid.onloadedmetadata = () => resolve(vid.duration)
      vid.src = videoUrl
    })

    setEditorState((prev) => ({ ...prev, videoFile: file, videoUrl, duration }))
    setProcessingError(null)
    setPhase('processing')

    try {
      setProcessingStatus('正在提取音訊…')
      const audioBlob = await extractAudio(file)

      setProcessingStatus('正在轉錄語音（Whisper）…')
      const subtitles = await transcribeAudio(audioBlob)

      setEditorState((prev) => ({ ...prev, subtitles }))
      setPhase('editor')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setProcessingError(msg)
      setProcessingStatus('')
    }
  }, [])

  const handleSubtitleUpdate = useCallback((updated: SubtitleSegment) => {
    setEditorState((prev) => ({
      ...prev,
      subtitles: prev.subtitles.map((s) => (s.id === updated.id ? updated : s)),
    }))
  }, [])

  const handleSubtitleDelete = useCallback((id: string) => {
    setEditorState((prev) => ({
      ...prev,
      subtitles: prev.subtitles.map((s) =>
        s.id === id ? { ...s, deleted: !s.deleted } : s
      ),
    }))
  }, [])

  const handleSelectForBroll = useCallback((subtitle: SubtitleSegment) => {
    setBrollSubtitle(subtitle)
    setActiveBottomPanel('broll')
  }, [])

  const handleBrollImageGenerated = useCallback((subtitleId: string, imageUrl: string) => {
    setEditorState((prev) => ({
      ...prev,
      subtitles: prev.subtitles.map((s) =>
        s.id === subtitleId ? { ...s, brollImageUrl: imageUrl } : s
      ),
    }))
  }, [])

  const handleStyleChange = useCallback((style: SubtitleStyle) => {
    setEditorState((prev) => ({ ...prev, style }))
  }, [])

  const handleThumbnailGenerated = useCallback((url: string) => {
    setEditorState((prev) => ({ ...prev, thumbnailUrl: url }))
  }, [])

  const handleSubtitleSelect = useCallback(
    (id: string) => {
      setSelectedSubtitleId(id)
      const sub = editorState.subtitles.find((s) => s.id === id)
      if (sub) videoSeekRef.current(sub.startTime)
    },
    [editorState.subtitles]
  )

  const handleRetry = () => {
    setPhase('upload')
    setProcessingError(null)
    setEditorState(defaultEditorState)
  }

  const togglePanel = (panel: 'thumbnail' | 'export') => {
    setActiveBottomPanel((prev) => (prev === panel ? null : panel))
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-gray-900 text-white font-tc overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-3 py-2 lg:px-5 lg:py-3 bg-gray-800 border-b border-gray-700 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-indigo-400 font-bold text-base lg:text-lg tracking-tight whitespace-nowrap">
            VideoEdit Pro
          </span>
          <span className="text-gray-500 text-xs hidden sm:inline truncate">口播影片自動剪輯</span>
        </div>
        {phase === 'editor' && (
          <div className="flex gap-1.5 shrink-0">
            <button
              onClick={() => togglePanel('thumbnail')}
              className={`px-2 py-1 lg:px-3 lg:py-1.5 rounded text-xs lg:text-sm font-medium transition-colors whitespace-nowrap ${
                activeBottomPanel === 'thumbnail'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              封面
            </button>
            <button
              onClick={() => togglePanel('export')}
              className={`px-2 py-1 lg:px-3 lg:py-1.5 rounded text-xs lg:text-sm font-medium transition-colors whitespace-nowrap ${
                activeBottomPanel === 'export'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              匯出
            </button>
          </div>
        )}
      </header>

      {/* Main */}
      <main className="flex-1 overflow-hidden min-h-0">
        {/* Upload */}
        {phase === 'upload' && (
          <div className="h-full flex items-center justify-center p-6">
            <VideoUpload onFileSelected={handleFileSelected} />
          </div>
        )}

        {/* Processing */}
        {phase === 'processing' && (
          <div className="h-full flex flex-col items-center justify-center gap-6 p-6">
            {processingError ? (
              <div className="flex flex-col items-center gap-4 max-w-sm text-center">
                <div className="w-16 h-16 rounded-full bg-red-900/50 flex items-center justify-center">
                  <span className="text-red-400 text-2xl">✕</span>
                </div>
                <h2 className="text-xl font-semibold text-red-400">處理失敗</h2>
                <p className="text-gray-400 text-sm break-all">{processingError}</p>
                <button
                  onClick={handleRetry}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white font-medium"
                >
                  重新上傳
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-6">
                <div className="relative w-20 h-20">
                  <div className="absolute inset-0 rounded-full border-4 border-gray-700" />
                  <div className="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
                </div>
                <div className="text-center">
                  <p className="text-white text-lg font-medium">{processingStatus}</p>
                  <p className="text-gray-500 text-sm mt-1">請稍候，這可能需要幾分鐘…</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Editor */}
        {phase === 'editor' && editorState.videoUrl && (
          <div className="h-full flex flex-col overflow-hidden">
            {/* Editor body */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">

              {/* ── Left column: Video + Timeline ── */}
              <div className="flex flex-col lg:w-[58%] lg:border-r border-gray-700 shrink-0 lg:shrink lg:overflow-hidden">
                {/* Video player: aspect-video on mobile, flex-1 on desktop */}
                <div className="relative w-full aspect-video lg:aspect-auto lg:flex-1 bg-black overflow-hidden">
                  <div className="absolute inset-0">
                    <VideoPlayer
                      videoUrl={editorState.videoUrl}
                      currentTime={currentTime}
                      duration={editorState.duration}
                      subtitles={editorState.subtitles}
                      style={editorState.style}
                      onTimeUpdate={setCurrentTime}
                      seekRef={videoSeekRef}
                    />
                  </div>
                </div>
                {/* Timeline */}
                <div className="shrink-0 border-t border-gray-700">
                  <Timeline
                    duration={editorState.duration}
                    subtitles={editorState.subtitles}
                    currentTime={currentTime}
                    onSeek={(t) => videoSeekRef.current(t)}
                  />
                </div>
              </div>

              {/* ── Right column: Subtitle Editor + Style Panel ── */}
              <div className="flex flex-col flex-1 lg:w-[42%] overflow-hidden min-h-0 border-t lg:border-t-0 border-gray-700">
                {/* Mobile tab bar */}
                <div className="flex lg:hidden shrink-0 border-b border-gray-700 bg-gray-800">
                  <button
                    onClick={() => setMobileTab('subtitles')}
                    className={`flex-1 py-2 text-sm font-medium transition-colors ${
                      mobileTab === 'subtitles'
                        ? 'text-indigo-400 border-b-2 border-indigo-400'
                        : 'text-gray-400'
                    }`}
                  >
                    字幕編輯 ({editorState.subtitles.filter(s => !s.deleted).length}/{editorState.subtitles.length})
                  </button>
                  <button
                    onClick={() => setMobileTab('style')}
                    className={`flex-1 py-2 text-sm font-medium transition-colors ${
                      mobileTab === 'style'
                        ? 'text-indigo-400 border-b-2 border-indigo-400'
                        : 'text-gray-400'
                    }`}
                  >
                    樣式設定
                  </button>
                </div>

                {/* Subtitle list — always on desktop, tab-controlled on mobile */}
                <div
                  className={`flex-1 overflow-y-auto min-h-0 ${
                    mobileTab !== 'subtitles' ? 'hidden lg:flex lg:flex-col' : ''
                  }`}
                >
                  <SubtitleEditor
                    subtitles={editorState.subtitles}
                    selectedId={selectedSubtitleId}
                    onUpdate={handleSubtitleUpdate}
                    onDelete={handleSubtitleDelete}
                    onSelectForBroll={handleSelectForBroll}
                    onSelect={handleSubtitleSelect}
                  />
                </div>

                {/* Style panel — always on desktop, tab-controlled on mobile */}
                <div
                  className={`shrink-0 lg:border-t border-gray-700 ${
                    mobileTab !== 'style' ? 'hidden lg:block' : ''
                  }`}
                >
                  <StylePanel style={editorState.style} onStyleChange={handleStyleChange} />
                </div>
              </div>
            </div>

            {/* ── Bottom panels ── */}
            {activeBottomPanel === 'broll' && brollSubtitle && (
              <div className="shrink-0 border-t border-gray-700 h-64 lg:h-72">
                <BRollPanel
                  selectedSubtitle={brollSubtitle}
                  onImageGenerated={handleBrollImageGenerated}
                  onClose={() => {
                    setActiveBottomPanel(null)
                    setBrollSubtitle(null)
                  }}
                />
              </div>
            )}

            {activeBottomPanel === 'thumbnail' && (
              <div className="shrink-0 border-t border-gray-700 h-72 lg:h-80">
                <ThumbnailEditor
                  videoFile={editorState.videoFile!}
                  currentTime={currentTime}
                  onThumbnailGenerated={handleThumbnailGenerated}
                  onClose={() => setActiveBottomPanel(null)}
                />
              </div>
            )}

            {activeBottomPanel === 'export' && (
              <div className="shrink-0 border-t border-gray-700 h-64 lg:h-72">
                <ExportPanel
                  videoFile={editorState.videoFile!}
                  subtitles={editorState.subtitles}
                  style={editorState.style}
                  duration={editorState.duration}
                  onClose={() => setActiveBottomPanel(null)}
                />
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
