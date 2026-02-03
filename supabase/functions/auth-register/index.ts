import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { encode } from 'https://deno.land/x/bcrypt@v0.4.1/mod.ts'

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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { email, password, name, requestedRole, message } = await req.json()

    // 이메일 중복 확인 (users와 user_applications 모두)
    const { data: existingUser } = await supabaseClient
      .from('users')
      .select('email')
      .eq('email', email)
      .single()

    if (existingUser) {
      return new Response(
        JSON.stringify({ message: '이미 등록된 이메일입니다.' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const { data: existingApplication } = await supabaseClient
      .from('user_applications')
      .select('email')
      .eq('email', email)
      .single()

    if (existingApplication) {
      return new Response(
        JSON.stringify({ message: '이미 신청된 이메일입니다.' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // 비밀번호 해싱
    const passwordHash = await encode(password)

    // 회원가입 신청 저장
    const { error } = await supabaseClient
      .from('user_applications')
      .insert({
        email,
        password_hash: passwordHash,
        name,
        requested_role: requestedRole,
        message: message || null,
        status: 'pending'
      })

    if (error) {
      throw error
    }

    return new Response(
      JSON.stringify({ 
        message: '회원가입 신청이 완료되었습니다. 관리자 승인을 기다려주세요.'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Registration error:', error)
    return new Response(
      JSON.stringify({ message: '회원가입 처리 중 오류가 발생했습니다.' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})