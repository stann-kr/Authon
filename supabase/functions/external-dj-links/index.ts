import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body = await req.json()
    const { action } = body

    // ---- VALIDATE TOKEN (public, no auth required) ----
    if (action === 'validate') {
      const { token } = body

      if (!token) {
        return new Response(
          JSON.stringify({ error: '토큰이 필요합니다.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data: link, error: linkError } = await supabaseAdmin
        .from('external_dj_links')
        .select('*')
        .eq('token', token)
        .eq('active', true)
        .single()

      if (linkError || !link) {
        return new Response(
          JSON.stringify({ error: '유효하지 않은 링크입니다.' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Check expiry
      if (link.expires_at && new Date(link.expires_at) < new Date()) {
        return new Response(
          JSON.stringify({ error: '만료된 링크입니다.' }),
          { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Check guest limit
      if (link.used_guests >= link.max_guests) {
        return new Response(
          JSON.stringify({ error: '게스트 등록 한도에 도달했습니다.' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Get venue info
      const { data: venue } = await supabaseAdmin
        .from('venues')
        .select('id, name, type')
        .eq('id', link.venue_id)
        .single()

      return new Response(
        JSON.stringify({
          link: {
            id: link.id,
            venue_id: link.venue_id,
            token: link.token,
            dj_name: link.dj_name,
            event: link.event,
            date: link.date,
            max_guests: link.max_guests,
            used_guests: link.used_guests,
            active: link.active,
          },
          venue: venue || null,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ---- CREATE GUEST VIA EXTERNAL LINK (public, no auth required) ----
    if (action === 'create-guest') {
      const { token, guestName, date } = body

      if (!token || !guestName || !date) {
        return new Response(
          JSON.stringify({ error: '필수 필드가 누락되었습니다. (token, guestName, date)' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Re-validate the link
      const { data: link, error: linkError } = await supabaseAdmin
        .from('external_dj_links')
        .select('*')
        .eq('token', token)
        .eq('active', true)
        .single()

      if (linkError || !link) {
        return new Response(
          JSON.stringify({ error: '유효하지 않은 링크입니다.' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (link.expires_at && new Date(link.expires_at) < new Date()) {
        return new Response(
          JSON.stringify({ error: '만료된 링크입니다.' }),
          { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (link.used_guests >= link.max_guests) {
        return new Response(
          JSON.stringify({ error: '게스트 등록 한도에 도달했습니다.' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Ensure the date matches
      if (link.date !== date) {
        return new Response(
          JSON.stringify({ error: '이 링크는 해당 날짜에 사용할 수 없습니다.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Create the guest using service_role (bypasses RLS)
      const { data: guest, error: guestError } = await supabaseAdmin
        .from('guests')
        .insert({
          venue_id: link.venue_id,
          name: guestName.trim().toUpperCase(),
          external_link_id: link.id,
          date: date,
          status: 'pending',
        })
        .select()
        .single()

      if (guestError) {
        throw guestError
      }

      // used_guests is auto-incremented by the trigger

      return new Response(
        JSON.stringify({
          message: '게스트가 등록되었습니다.',
          guest,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: '알 수 없는 action입니다.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('External DJ links error:', error)
    return new Response(
      JSON.stringify({ error: error.message || '처리 중 오류가 발생했습니다.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
