import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const formData = await req.formData()
    const audioFile = formData.get('audio') as File | null

    if (!audioFile) {
      return new Response(JSON.stringify({ error: 'No audio file provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const openaiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiKey) {
      throw new Error('OPENAI_API_KEY is not configured')
    }

    const whisperForm = new FormData()
    whisperForm.append('file', audioFile, 'audio.webm')
    whisperForm.append('model', 'whisper-1')
    whisperForm.append('language', 'zh')
    whisperForm.append('response_format', 'verbose_json')
    whisperForm.append('timestamp_granularities[]', 'segment')

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${openaiKey}` },
      body: whisperForm,
    })

    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`Whisper API error: ${errText}`)
    }

    const result = await response.json()

    // Map Whisper segments to our SubtitleSegment format
    const segments = (result.segments ?? []).map((seg: {
      id?: number
      start?: number
      end?: number
      text?: string
    }, index: number) => ({
      id: `seg-${seg.id ?? index}`,
      startTime: seg.start ?? 0,
      endTime: seg.end ?? 0,
      text: (seg.text ?? '').trim(),
      deleted: false,
    }))

    return new Response(JSON.stringify({ segments }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
