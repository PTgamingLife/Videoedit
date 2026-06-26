import { createClient } from '@supabase/supabase-js'
import type { SubtitleSegment } from './types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * Call the Supabase Edge Function 'transcribe' with an audio blob.
 * Returns an array of SubtitleSegment parsed from Whisper output.
 */
export async function transcribeAudio(audioBlob: Blob): Promise<SubtitleSegment[]> {
  const formData = new FormData()
  formData.append('audio', audioBlob, 'audio.webm')

  const { data, error } = await supabase.functions.invoke('transcribe', {
    body: formData,
  })

  if (error) {
    throw new Error(`Transcription failed: ${error.message}`)
  }

  // Edge function returns { segments: [...] }
  const segments: SubtitleSegment[] = (data.segments ?? data).map(
    (seg: { id?: string; start?: number; end?: number; text?: string }, index: number) => ({
      id: seg.id ?? `seg-${index}`,
      startTime: seg.start ?? 0,
      endTime: seg.end ?? 0,
      text: (seg.text ?? '').trim(),
      deleted: false,
      brollImageUrl: undefined,
    })
  )

  return segments
}

/**
 * Call the Supabase Edge Function 'generate-image' to produce a B-roll image.
 * Returns the public image URL from DALL-E 3.
 */
export async function generateBrollImage(
  prompt: string,
  subtitleContext: string
): Promise<string> {
  const { data, error } = await supabase.functions.invoke('generate-image', {
    body: JSON.stringify({ prompt, context: subtitleContext }),
    headers: { 'Content-Type': 'application/json' },
  })

  if (error) {
    throw new Error(`B-roll generation failed: ${error.message}`)
  }

  return data.imageUrl as string
}

/**
 * Call the Supabase Edge Function 'generate-thumbnail' to produce a thumbnail image.
 * Returns the public image URL from DALL-E 3.
 */
export async function generateThumbnail(
  prompt: string,
  frameBase64?: string
): Promise<string> {
  const { data, error } = await supabase.functions.invoke('generate-thumbnail', {
    body: JSON.stringify({ prompt, frameBase64 }),
    headers: { 'Content-Type': 'application/json' },
  })

  if (error) {
    throw new Error(`Thumbnail generation failed: ${error.message}`)
  }

  return data.imageUrl as string
}
