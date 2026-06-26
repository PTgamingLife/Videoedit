'use client'

import type { SubtitleSegment, SubtitleStyle } from './types'

let ffmpegInstance: import('@ffmpeg/ffmpeg').FFmpeg | null = null
let isLoaded = false

/**
 * Lazily load and initialize the ffmpeg.wasm instance.
 * Must be called in a browser context with COOP/COEP headers.
 */
export async function initFFmpeg(): Promise<import('@ffmpeg/ffmpeg').FFmpeg> {
  if (ffmpegInstance && isLoaded) return ffmpegInstance

  const { FFmpeg } = await import('@ffmpeg/ffmpeg')
  const { toBlobURL } = await import('@ffmpeg/util')

  const ff = new FFmpeg()

  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd'
  await ff.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  })

  ffmpegInstance = ff
  isLoaded = true
  return ff
}

/** Convert FileData (Uint8Array | string) from ffmpeg to a Blob. */
function fileDataToBlob(data: unknown, mimeType: string): Blob {
  if (typeof data === 'string') {
    return new Blob([data], { type: mimeType })
  }
  // Copy into a plain ArrayBuffer to avoid SharedArrayBuffer typing issues
  const u8 = data as Uint8Array
  const copy = new Uint8Array(u8.length)
  copy.set(u8)
  return new Blob([copy.buffer], { type: mimeType })
}

/** Convert FileData to a base64 data URL. */
function fileDataToBase64DataURL(data: unknown, mimeType: string): string {
  const u8 = data as Uint8Array
  let binary = ''
  for (let i = 0; i < u8.length; i++) {
    binary += String.fromCharCode(u8[i])
  }
  const base64 = btoa(binary)
  return `data:${mimeType};base64,${base64}`
}

/**
 * Extract audio from a video file as a WebM/Opus blob suitable for Whisper.
 */
export async function extractAudio(videoFile: File): Promise<Blob> {
  const { fetchFile } = await import('@ffmpeg/util')
  const ff = await initFFmpeg()

  const inputName = 'input_video'
  const outputName = 'output_audio.webm'

  await ff.writeFile(inputName, await fetchFile(videoFile))

  await ff.exec([
    '-i', inputName,
    '-vn',
    '-acodec', 'libopus',
    '-b:a', '64k',
    '-ar', '16000',
    outputName,
  ])

  const data = await ff.readFile(outputName)
  await ff.deleteFile(inputName)
  await ff.deleteFile(outputName)

  return fileDataToBlob(data, 'audio/webm')
}

/**
 * Build an SRT string from subtitle segments.
 */
function buildSRT(subtitles: SubtitleSegment[]): string {
  const formatTime = (s: number): string => {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = Math.floor(s % 60)
    const ms = Math.round((s - Math.floor(s)) * 1000)
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')},${String(ms).padStart(3, '0')}`
  }

  return subtitles
    .filter((seg) => !seg.deleted)
    .map((seg, i) => `${i + 1}\n${formatTime(seg.startTime)} --> ${formatTime(seg.endTime)}\n${seg.text}\n`)
    .join('\n')
}

/**
 * Get ASS style string for burning subtitles.
 * Returns a force_style compatible string for the subtitles filter.
 */
function buildForceStyle(style: SubtitleStyle): string {
  const { colorPreset, verticalPosition } = style

  // ASS alignment: 2=bottom-center, 8=top-center, 5=middle-center
  let alignment = '2'
  if (verticalPosition === 'top') alignment = '8'
  else if (verticalPosition === 'center') alignment = '5'

  // Colours in ASS hex: &HAABBGGRR (alpha, blue, green, red)
  let primaryColour = '&H00FFFFFF' // white
  let outlineColour = '&H00000000' // black
  let backColour = '&H00000000'
  let outline = '2'
  let shadow = '0'
  let borderStyle = '1' // 1=outline, 3=opaque box

  switch (colorPreset) {
    case 'white-black-stroke':
      primaryColour = '&H00FFFFFF'
      outlineColour = '&H00000000'
      outline = '2'
      borderStyle = '1'
      break
    case 'yellow-black-stroke':
      primaryColour = '&H0000E5FF' // yellow in BGR
      outlineColour = '&H00000000'
      outline = '2'
      borderStyle = '1'
      break
    case 'white-black-box':
      primaryColour = '&H00FFFFFF'
      backColour = '&HBF000000' // semi-transparent black
      outline = '0'
      shadow = '0'
      borderStyle = '3'
      break
  }

  return [
    `FontName=Noto Sans TC`,
    `FontSize=24`,
    `PrimaryColour=${primaryColour}`,
    `OutlineColour=${outlineColour}`,
    `BackColour=${backColour}`,
    `Outline=${outline}`,
    `Shadow=${shadow}`,
    `BorderStyle=${borderStyle}`,
    `Alignment=${alignment}`,
    `MarginV=30`,
  ].join(',')
}

/**
 * Cut video: keep only the non-deleted segments, concatenate them into one blob.
 */
export async function cutVideoSegments(
  videoFile: File,
  keepSegments: { start: number; end: number }[]
): Promise<Blob> {
  const { fetchFile } = await import('@ffmpeg/util')
  const ff = await initFFmpeg()

  if (keepSegments.length === 0) {
    throw new Error('No segments to keep')
  }

  const inputName = 'source.mp4'
  await ff.writeFile(inputName, await fetchFile(videoFile))

  const segmentFiles: string[] = []

  for (let i = 0; i < keepSegments.length; i++) {
    const seg = keepSegments[i]
    const segName = `seg_${i}.mp4`
    const segDuration = seg.end - seg.start

    await ff.exec([
      '-i', inputName,
      '-ss', String(seg.start),
      '-t', String(segDuration),
      '-c:v', 'libx264',
      '-c:a', 'aac',
      '-avoid_negative_ts', 'make_zero',
      segName,
    ])
    segmentFiles.push(segName)
  }

  let outputBlob: Blob

  if (segmentFiles.length === 1) {
    const data = await ff.readFile(segmentFiles[0])
    outputBlob = fileDataToBlob(data, 'video/mp4')
  } else {
    const concatList = segmentFiles.map((f) => `file '${f}'`).join('\n')
    const encoder = new TextEncoder()
    await ff.writeFile('concat_list.txt', encoder.encode(concatList))

    await ff.exec([
      '-f', 'concat',
      '-safe', '0',
      '-i', 'concat_list.txt',
      '-c', 'copy',
      'output_cut.mp4',
    ])

    const data = await ff.readFile('output_cut.mp4')
    outputBlob = fileDataToBlob(data, 'video/mp4')

    await ff.deleteFile('concat_list.txt')
    await ff.deleteFile('output_cut.mp4')
  }

  await ff.deleteFile(inputName)
  for (const f of segmentFiles) {
    await ff.deleteFile(f)
  }

  return outputBlob
}

/**
 * Burn subtitles onto a video blob using ffmpeg subtitles filter.
 * Returns the final MP4 blob with burned-in subtitles.
 */
export async function burnSubtitles(
  videoBlob: Blob,
  subtitles: SubtitleSegment[],
  style: SubtitleStyle
): Promise<Blob> {
  const { fetchFile } = await import('@ffmpeg/util')
  const ff = await initFFmpeg()

  const inputName = 'cut_video.mp4'
  const srtName = 'subs.srt'
  const outputName = 'final_output.mp4'

  await ff.writeFile(inputName, await fetchFile(videoBlob))

  const srtContent = buildSRT(subtitles)
  const encoder = new TextEncoder()
  await ff.writeFile(srtName, encoder.encode(srtContent))

  const forceStyle = buildForceStyle(style)

  await ff.exec([
    '-i', inputName,
    '-vf', `subtitles=${srtName}:force_style='${forceStyle}'`,
    '-c:v', 'libx264',
    '-c:a', 'aac',
    '-preset', 'fast',
    outputName,
  ])

  const data = await ff.readFile(outputName)
  const outputBlob = fileDataToBlob(data, 'video/mp4')

  await ff.deleteFile(inputName)
  await ff.deleteFile(srtName)
  await ff.deleteFile(outputName)

  return outputBlob
}

/**
 * Extract a single video frame at the given time as a base64 PNG data URL.
 */
export async function extractFrame(
  videoFile: File,
  timeSeconds: number
): Promise<string> {
  const { fetchFile } = await import('@ffmpeg/util')
  const ff = await initFFmpeg()

  const inputName = 'frame_source.mp4'
  const outputName = 'frame_out.png'

  await ff.writeFile(inputName, await fetchFile(videoFile))

  await ff.exec([
    '-ss', String(timeSeconds),
    '-i', inputName,
    '-vframes', '1',
    '-q:v', '2',
    outputName,
  ])

  const data = await ff.readFile(outputName)
  const dataUrl = fileDataToBase64DataURL(data, 'image/png')

  await ff.deleteFile(inputName)
  await ff.deleteFile(outputName)

  return dataUrl
}

/**
 * Full export pipeline:
 * 1. Cut video to keep only non-deleted segments
 * 2. Burn subtitles with chosen style
 * Returns final MP4 blob.
 */
export async function exportVideo(
  videoFile: File,
  subtitles: SubtitleSegment[],
  style: SubtitleStyle,
  onProgress?: (phase: string, percent: number) => void
): Promise<Blob> {
  const kept = subtitles
    .filter((s) => !s.deleted)
    .map((s) => ({ start: s.startTime, end: s.endTime }))

  if (kept.length === 0) throw new Error('所有片段都已刪除')

  onProgress?.('剪輯中…', 10)
  const cutBlob = await cutVideoSegments(videoFile, kept)

  onProgress?.('燒錄字幕…', 60)
  const finalBlob = await burnSubtitles(cutBlob, subtitles, style)

  onProgress?.('完成', 100)
  return finalBlob
}
