import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    if (req.method === 'GET') {
      // 사용자 목록 조회
      const { data: users, error } = await supabaseClient
        .from('users')
        .select('id, email, name, role, guest_limit, is_active, created_at')
        .order('created_at', { ascending: false })

      if (error) throw error

      return new Response(
        JSON.stringify({ users }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (req.method === 'POST') {
      const url = new URL(req.url)
      const path = url.pathname

      if (path.endsWith('/update')) {
        // 사용자 정보 업데이트
        const { userId, role, guest_limit, is_active } = await req.json()

        const updates: any = {}
        if (role !== undefined) updates.role = role
        if (guest_limit !== undefined) updates.guest_limit = guest_limit
        if (is_active !== undefined) updates.is_active = is_active
        updates.updated_at = new Date().toISOString()

        const { error } = await supabaseClient
          .from('users')
          .update(updates)
          .eq('id', userId)

        if (error) throw error

        return new Response(
          JSON.stringify({ message: 'User information updated.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    return new Response(
      JSON.stringify({ message: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Admin users error:', error)
    return new Response(
      JSON.stringify({ message: 'An error occurred while processing the request.' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})