import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

/**
 * Ensure public.users profile exists for a given auth user.
 * The on_auth_user_created trigger should have created it, but may fail silently.
 * This function acts as a safety net: upsert if missing.
 */
async function ensurePublicProfile(
  supabaseAdmin: any,
  authUserId: string,
  email: string,
  profileData: { name: string; role: string; venue_id: string | null; guest_limit: number; active: boolean }
): Promise<{ data: any; error: any }> {
  // 1. Check if trigger already created the profile
  const { data: existing } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('auth_user_id', authUserId)
    .single()

  if (existing) {
    // Profile exists (trigger succeeded) — update active status if needed
    if (existing.active !== profileData.active) {
      const { data: updated, error: updateErr } = await supabaseAdmin
        .from('users')
        .update({ active: profileData.active })
        .eq('auth_user_id', authUserId)
        .select('*')
        .single()
      return { data: updated ?? existing, error: updateErr }
    }
    return { data: existing, error: null }
  }

  // 2. Trigger failed → manually create the profile
  console.warn(`Trigger did not create public.users for auth_user_id=${authUserId}. Creating manually.`)
  const { data: created, error: insertErr } = await supabaseAdmin
    .from('users')
    .insert({
      auth_user_id: authUserId,
      email,
      name: profileData.name,
      role: profileData.role,
      venue_id: profileData.venue_id,
      guest_limit: profileData.guest_limit,
      active: profileData.active,
    })
    .select('*')
    .single()

  return { data: created, error: insertErr }
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
    let { data: callerProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('id, role, venue_id')
      .eq('auth_user_id', caller.id)
      .single()

    // FALLBACK: Auto-create missing caller profile from auth metadata
    if (profileError || !callerProfile) {
      const { data: authUserData, error: adminAuthError } = await supabaseAdmin.auth.admin.getUserById(caller.id)
      
      if (adminAuthError || !authUserData?.user) {
        return new Response(
          JSON.stringify({ error: '호출자 인증 정보를 가져올 수 없습니다.' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      const authUser = authUserData.user
      const authRole = authUser.app_metadata?.app_role || authUser.user_metadata?.role
      const authVenueId = authUser.app_metadata?.app_venue_id || authUser.user_metadata?.venue_id
      
      if (!authRole || (authRole !== 'super_admin' && !authVenueId)) {
        return new Response(
          JSON.stringify({ error: '호출자 프로필을 찾을 수 없습니다. 관리자에게 문의하세요.' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      const { data: createdProfile, error: createProfileError } = await ensurePublicProfile(
        supabaseAdmin,
        caller.id,
        authUser.email ?? '',
        {
          name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
          role: authRole,
          venue_id: authVenueId || null,
          guest_limit: authUser.user_metadata?.guest_limit || (authRole === 'venue_admin' ? 999 : 10),
          active: true,
        }
      )
      
      if (createProfileError || !createdProfile) {
        return new Response(
          JSON.stringify({ error: '프로필 자동 생성 실패: ' + (createProfileError?.message || '알 수 없는 오류') }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      callerProfile = createdProfile
    }

    const body = await req.json()

    // ---- DELETE USER ----
    if (body.action === 'delete') {
      const { userId } = body

      if (callerProfile.role !== 'super_admin' && callerProfile.role !== 'venue_admin') {
        return new Response(
          JSON.stringify({ error: '권한이 없습니다.' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

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

      if (callerProfile.role === 'venue_admin' && targetUser.venue_id !== callerProfile.venue_id) {
        return new Response(
          JSON.stringify({ error: '다른 베뉴의 사용자를 삭제할 수 없습니다.' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (targetUser.auth_user_id) {
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(targetUser.auth_user_id)
        if (deleteError) throw deleteError
      }

      // Also delete public.users row in case cascade doesn't fire
      await supabaseAdmin.from('users').delete().eq('id', userId)

      return new Response(
        JSON.stringify({ message: '사용자가 삭제되었습니다.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ---- CREATE USER ----
    const { email, name, role, venueId, guestLimit, password } = body

    // Validate required fields
    if (!email || !name || !role) {
      return new Response(
        JSON.stringify({ error: '필수 필드가 누락되었습니다. (email, name, role)' }),
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

    if (callerProfile.role === 'venue_admin') {
      if (venueId !== callerProfile.venue_id) {
        return new Response(
          JSON.stringify({ error: '다른 베뉴에 사용자를 생성할 수 없습니다.' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      if (role === 'super_admin') {
        return new Response(
          JSON.stringify({ error: '슈퍼 어드민은 생성할 수 없습니다.' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Check for duplicate email BEFORE creating auth user
    const { data: existingUsers } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .limit(1)
    
    if (existingUsers && existingUsers.length > 0) {
      return new Response(
        JSON.stringify({ error: '이미 등록된 이메일입니다.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userData = {
      name,
      role,
      venue_id: venueId ?? null,
      guest_limit: guestLimit ?? 10,
    }

    let newAuthUser: any
    let createError: any
    let successMessage: string
    const isInviteMode = !password

    if (password) {
      // ---- MODE A: Create with temporary password (instant activation) ----
      const result = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: userData,
        app_metadata: {
          app_role: role,
          app_venue_id: venueId ?? null,
        },
      })
      newAuthUser = result.data
      createError = result.error
      successMessage = `계정이 생성되었습니다. 임시 비밀번호: ${password}`
    } else {
      // ---- MODE B: Invite by email (classic flow) ----
      const result = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: userData,
        redirectTo: `${req.headers.get('origin') || Deno.env.get('SITE_URL') || ''}/auth/reset-password`,
      })
      newAuthUser = result.data
      createError = result.error
      successMessage = '초대 이메일이 전송되었습니다.'
    }

    if (createError) {
      if (createError.message?.includes('already been registered') || createError.message?.includes('already exists')) {
        return new Response(
          JSON.stringify({ error: '이미 등록된 이메일입니다.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      throw createError
    }

    if (!newAuthUser?.user?.id) {
      throw new Error('Auth 사용자가 생성되었지만 ID를 가져올 수 없습니다.')
    }

    const authUserId = newAuthUser.user.id

    // Always set app_metadata explicitly (trigger may set it, but we ensure correctness)
    await supabaseAdmin.auth.admin.updateUserById(authUserId, {
      app_metadata: {
        app_role: role,
        app_venue_id: venueId ?? null,
      },
    })

    // Wait for trigger to potentially create public.users, then ensure it exists
    await new Promise(resolve => setTimeout(resolve, 800))

    const { data: newUser, error: profileError2 } = await ensurePublicProfile(
      supabaseAdmin,
      authUserId,
      email,
      {
        name,
        role,
        venue_id: venueId ?? null,
        guest_limit: guestLimit ?? 10,
        active: !isInviteMode, // invite → inactive until user sets password; temp password → active
      }
    )

    if (profileError2) {
      // Auth user was created but profile failed → clean up auth user to avoid orphan
      console.error('Failed to create profile, cleaning up auth user:', profileError2)
      await supabaseAdmin.auth.admin.deleteUser(authUserId)
      return new Response(
        JSON.stringify({ error: '사용자 프로필 생성 실패: ' + profileError2.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        message: successMessage,
        user: newUser,
        tempPassword: password || undefined,
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
