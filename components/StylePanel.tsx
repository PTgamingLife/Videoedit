'use client'

import type { SubtitleStyle, ColorPreset, VerticalPosition } from '@/lib/types'

interface StylePanelProps {
  style: SubtitleStyle
  onStyleChange: (style: SubtitleStyle) => void
}

const COLOR_PRESETS: {
  id: ColorPreset
  label: string
  desc: string
  preview: React.CSSProperties
}[] = [
  {
    id: 'white-black-stroke',
    label: '白字黑邊',
    desc: 'White / Black outline',
    preview: {
      color: '#ffffff',
      textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000',
      background: 'transparent',
    },
  },
  {
    id: 'yellow-black-stroke',
    label: '黃字黑邊',
    desc: 'Yellow / Black outline',
    preview: {
      color: '#FFE000',
      textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000',
      background: 'transparent',
    },
  },
  {
    id: 'white-black-box',
    label: '白字黑底',
    desc: 'White / Black box',
    preview: {
      color: '#ffffff',
      background: 'rgba(0,0,0,0.75)',
      padding: '2px 8px',
      borderRadius: '3px',
    },
  },
]

const POSITIONS: { id: VerticalPosition; label: string }[] = [
  { id: 'top', label: '上' },
  { id: 'center', label: '中' },
  { id: 'bottom', label: '下' },
]

export default function StylePanel({ style, onStyleChange }: StylePanelProps) {
  const setColor = (colorPreset: ColorPreset) => {
    onStyleChange({ ...style, colorPreset })
  }

  const setPosition = (verticalPosition: VerticalPosition) => {
    onStyleChange({ ...style, verticalPosition })
  }

  return (
    <div className="px-4 py-3 bg-gray-800/50 space-y-3">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">字幕樣式</h3>

      {/* Color presets */}
      <div>
        <p className="text-xs text-gray-500 mb-2">顏色預設</p>
        <div className="grid grid-cols-3 gap-2">
          {COLOR_PRESETS.map((preset) => {
            const isActive = style.colorPreset === preset.id
            return (
              <button
                key={preset.id}
                onClick={() => setColor(preset.id)}
                className={`flex flex-col items-center gap-1.5 p-2.5 rounded-lg border transition-all ${
                  isActive
                    ? 'border-indigo-500 bg-indigo-900/30'
                    : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                }`}
              >
                {/* Preview swatch */}
                <div className="w-full h-8 rounded flex items-center justify-center bg-gray-600">
                  <span
                    className="text-sm font-semibold font-tc"
                    style={preset.preview}
                  >
                    字幕
                  </span>
                </div>
                <span className="text-xs text-gray-300 font-medium">{preset.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Vertical position */}
      <div>
        <p className="text-xs text-gray-500 mb-2">垂直位置</p>
        <div className="flex gap-2">
          {POSITIONS.map((pos) => {
            const isActive = style.verticalPosition === pos.id
            return (
              <button
                key={pos.id}
                onClick={() => setPosition(pos.id)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all border ${
                  isActive
                    ? 'bg-indigo-600 border-indigo-500 text-white'
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-300'
                }`}
              >
                {pos.label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
