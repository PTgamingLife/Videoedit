import type { SubtitleSegment } from './types'

/**
 * Lazily create the Supabase client only when first needed (avoids SSR crashes
 * when env vars are absent at build time).
 */
function getClient() {
  if (typeof window === 'undefined') {
    throw new Error('Supabase client can only be used in the browser')
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set in .env.local'
    )
  }

  // Dynamic import so the module itself doesn't execute at SSR/build time
  const { createClient } = require('@supabase/supabase-js') as typeof import('@supabase/supabase-js')
  return createClient(supabaseUrl, supabaseAnonKey)
}

/**
 * Call the Supabase Edge Function 'transcribe' with an audio blob.
 * Returns an array of SubtitleSegment parsed from Whisper output.
 */
export async function transcribeAudio(audioBlob: Blob): Promise<SubtitleSegment[]> {
  const client = getClient()
  const formData = new FormData()
  formData.append('audio', audioBlob, 'audio.webm')

  const { data, error } = await client.functions.invoke('transcribe', {
    body: formData,
  })

  if (error) {
    throw new Error(`Transcription failed: ${error.message}`)
  }

  // Edge function returns { segments: [...] }
  const segments: SubtitleSegment[] = (data.segments ?? data).map(
    (
      seg: { id?: string; start?: number; startTime?: number; end?: number; endTime?: number; text?: string },
      index: number
    ) => ({
      id: seg.id ?? `seg-${index}`,
      startTime: seg.startTime ?? seg.start ?? 0,
      endTime: seg.endTime ?? seg.end ?? 0,
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
  const client = getClient()

  const { data, error } = await client.functions.invoke('generate-image', {
    body: { prompt, context: subtitleContext },
  })

  if (error) {
    let msg = error.message
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const body = await (error as any).context?.json?.()
      if (body?.error) msg = body.error
    } catch {}
    throw new Error(`B-roll generation failed: ${msg}`)
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
  const client = getClient()

  const { data, error } = await client.functions.invoke('generate-thumbnail', {
    body: { prompt, frameBase64 },
  })

  if (error) {
    let msg = error.message
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const body = await (error as any).context?.json?.()
      if (body?.error) msg = body.error
    } catch {}
    throw new Error(`Thumbnail generation failed: ${msg}`)
  }

  return data.imageUrl as string
}
