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
    const { prompt, frameBase64 } = await req.json() as {
      prompt: string
      frameBase64?: string
    }

    const openaiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiKey) throw new Error('OPENAI_API_KEY is not configured')

    const basePrompt = prompt?.trim() || '專業短影片封面，吸睛設計'
    const enhancedPrompt = `YouTube 短影片封面設計，${basePrompt}，高對比度，視覺衝擊力強，專業攝影或設計風格，16:9 橫幅，無多餘文字`

    const requestBody: Record<string, unknown> = {
      model: 'dall-e-3',
      prompt: enhancedPrompt,
      n: 1,
      size: '1792x1024',
      quality: 'hd',
    }

    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`DALL-E API error: ${errText}`)
    }

    const result = await response.json()
    const imageUrl = result.data?.[0]?.url

    if (!imageUrl) throw new Error('No image URL returned from DALL-E')

    return new Response(JSON.stringify({ imageUrl }), {
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
