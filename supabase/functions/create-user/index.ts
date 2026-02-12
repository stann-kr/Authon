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
    // 1. Verify the caller is authenticated and has admin privileges
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: '인증이 필요합니다.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create admin client (service_role) for user creation
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Create user client to verify caller identity
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    // Verify caller
    const { data: { user: caller }, error: authError } = await supabaseUser.auth.getUser()
    if (authError || !caller) {
      return new Response(
        JSON.stringify({ error: '인증 실패' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get caller's role from public.users
    const { data: callerProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('id, role, venue_id')
      .eq('auth_user_id', caller.id)
      .single()

    if (profileError || !callerProfile) {
      return new Response(
        JSON.stringify({ error: '호출자 프로필을 찾을 수 없습니다.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.json()

    // ---- DELETE USER ----
    if (body.action === 'delete') {
      const { userId } = body

      // Check permissions
      if (callerProfile.role !== 'super_admin' && callerProfile.role !== 'venue_admin') {
        return new Response(
          JSON.stringify({ error: '권한이 없습니다.' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Get the user to delete
      const { data: targetUser } = await supabaseAdmin
        .from('users')
        .select('auth_user_id, venue_id')
        .eq('id', userId)
        .single()

      if (!targetUser) {
        return new Response(
          JSON.stringify({ error: '사용자를 찾을 수 없습니다.' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Venue admin can only delete users in their venue
      if (callerProfile.role === 'venue_admin' && targetUser.venue_id !== callerProfile.venue_id) {
        return new Response(
          JSON.stringify({ error: '다른 베뉴의 사용자를 삭제할 수 없습니다.' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Delete auth user (cascade will delete public.users row)
      if (targetUser.auth_user_id) {
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(targetUser.auth_user_id)
        if (deleteError) throw deleteError
      }

      return new Response(
        JSON.stringify({ message: '사용자가 삭제되었습니다.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ---- CREATE USER ----
    const { email, password, name, role, venueId, guestLimit } = body

    // Validate required fields (venueId nullable for super_admin)
    if (!email || !password || !name || !role) {
      return new Response(
        JSON.stringify({ error: '필수 필드가 누락되었습니다. (email, password, name, role)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    if (role !== 'super_admin' && !venueId) {
      return new Response(
        JSON.stringify({ error: 'super_admin 이외의 역할은 venueId가 필요합니다.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Permission checks
    const allowedRoles = ['super_admin', 'venue_admin']
    if (!allowedRoles.includes(callerProfile.role)) {
      return new Response(
        JSON.stringify({ error: '사용자 생성 권한이 없습니다.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Venue admin can only create users in their own venue
    if (callerProfile.role === 'venue_admin') {
      if (venueId !== callerProfile.venue_id) {
        return new Response(
          JSON.stringify({ error: '다른 베뉴에 사용자를 생성할 수 없습니다.' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      // Venue admin cannot create super_admin or venue_admin
      if (role === 'super_admin' || role === 'venue_admin') {
        return new Response(
          JSON.stringify({ error: '베뉴 어드민은 어드민 역할을 생성할 수 없습니다.' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Only super_admin can create venue_admin
    if (role === 'venue_admin' && callerProfile.role !== 'super_admin') {
      return new Response(
        JSON.stringify({ error: '베뉴 어드민은 슈퍼 어드민만 생성할 수 있습니다.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Create Supabase Auth user with metadata
    //    The on_auth_user_created trigger will auto-create public.users row
    const { data: newAuthUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Skip email verification for admin-created users
      user_metadata: {
        name,
        role,
        venue_id: venueId ?? null,
        guest_limit: guestLimit ?? 10,
      },
      app_metadata: {
        app_role: role,
        app_venue_id: venueId ?? null,
      },
    })

    if (createError) {
      // Check for duplicate email
      if (createError.message?.includes('already been registered')) {
        return new Response(
          JSON.stringify({ error: '이미 등록된 이메일입니다.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      throw createError
    }

    // 3. Fetch the created public.users profile (created by trigger)
    // Small delay to ensure trigger has fired
    await new Promise(resolve => setTimeout(resolve, 500))

    const { data: newUser } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('auth_user_id', newAuthUser.user.id)
      .single()

    return new Response(
      JSON.stringify({
        message: '사용자가 생성되었습니다.',
        user: newUser,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Create user error:', error)
    return new Response(
      JSON.stringify({ error: error.message || '사용자 생성 중 오류가 발생했습니다.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
