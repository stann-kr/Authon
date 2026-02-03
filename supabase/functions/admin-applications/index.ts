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
      // 신청 목록 조회
      const { data: applications, error } = await supabaseClient
        .from('user_applications')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      return new Response(
        JSON.stringify({ applications }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (req.method === 'POST') {
      const url = new URL(req.url)
      const path = url.pathname

      if (path.endsWith('/action')) {
        // 신청 승인/거절 처리
        const { applicationId, action, guestLimit } = await req.json()

        if (action === 'approve') {
          // 신청 정보 조회
          const { data: application, error: fetchError } = await supabaseClient
            .from('user_applications')
            .select('*')
            .eq('id', applicationId)
            .single()

          if (fetchError || !application) {
            throw new Error('신청 정보를 찾을 수 없습니다.')
          }

          // 사용자 테이블에 추가
          const { error: insertError } = await supabaseClient
            .from('users')
            .insert({
              email: application.email,
              password_hash: application.password_hash,
              name: application.name,
              role: application.requested_role,
              guest_limit: guestLimit || (application.requested_role === 'DJ' ? 20 : 0),
              is_active: true
            })

          if (insertError) throw insertError

          // 신청 상태 업데이트
          const { error: updateError } = await supabaseClient
            .from('user_applications')
            .update({ status: 'approved', updated_at: new Date().toISOString() })
            .eq('id', applicationId)

          if (updateError) throw updateError

        } else if (action === 'reject') {
          // 신청 거절
          const { error: updateError } = await supabaseClient
            .from('user_applications')
            .update({ status: 'rejected', updated_at: new Date().toISOString() })
            .eq('id', applicationId)

          if (updateError) throw updateError
        }

        return new Response(
          JSON.stringify({ message: '처리되었습니다.' }),
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
    console.error('Admin applications error:', error)
    return new Response(
      JSON.stringify({ message: '처리 중 오류가 발생했습니다.' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})