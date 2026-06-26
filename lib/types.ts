export interface SubtitleSegment {
  id: string
  startTime: number // seconds
  endTime: number   // seconds
  text: string
  deleted: boolean
  brollImageUrl?: string
}

export type ColorPreset =
  | 'white-black-stroke'
  | 'yellow-black-stroke'
  | 'white-black-box'

export type VerticalPosition = 'top' | 'center' | 'bottom'

export interface SubtitleStyle {
  colorPreset: ColorPreset
  verticalPosition: VerticalPosition
}

export interface EditorState {
  videoFile: File | null
  videoUrl: string | null
  duration: number
  subtitles: SubtitleSegment[]
  style: SubtitleStyle
  thumbnailUrl: string | null
}
