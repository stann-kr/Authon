import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/**
 * Ensure public.users profile exists for a given auth user.
 * The on_auth_user_created trigger should have created it, but may fail silently.
 * This function acts as a safety net: upsert if missing.
 */
async function ensurePublicProfile(
  supabaseAdmin: any,
  authUserId: string,
  email: string,
  profileData: {
    name: string;
    role: string;
    venue_id: string | null;
    guest_limit: number;
    active: boolean;
  },
): Promise<{ data: any; error: any }> {
  // 1. Check if trigger already created the profile
  const { data: existing } = await supabaseAdmin
    .from("users")
    .select("*")
    .eq("auth_user_id", authUserId)
    .single();

  if (existing) {
    // Profile exists (trigger succeeded) — update active status if needed
    if (existing.active !== profileData.active) {
      const { data: updated, error: updateErr } = await supabaseAdmin
        .from("users")
        .update({ active: profileData.active })
        .eq("auth_user_id", authUserId)
        .select("*")
        .single();
      return { data: updated ?? existing, error: updateErr };
    }
    return { data: existing, error: null };
  }

  // 2. Trigger failed → manually create the profile
  console.warn(
    `Trigger did not create public.users for auth_user_id=${authUserId}. Creating manually.`,
  );
  const { data: created, error: insertErr } = await supabaseAdmin
    .from("users")
    .insert({
      auth_user_id: authUserId,
      email,
      name: profileData.name,
      role: profileData.role,
      venue_id: profileData.venue_id,
      guest_limit: profileData.guest_limit,
      active: profileData.active,
    })
    .select("*")
    .single();

  return { data: created, error: insertErr };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Verify the caller is authenticated and has admin privileges
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authentication is required." }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Create admin client (service_role) for user creation
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Create user client to verify caller identity
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    // Verify caller
    const {
      data: { user: caller },
      error: authError,
    } = await supabaseUser.auth.getUser();
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: "Authentication failed." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get caller's role from public.users
    let { data: callerProfile, error: profileError } = await supabaseAdmin
      .from("users")
      .select("id, role, venue_id")
      .eq("auth_user_id", caller.id)
      .single();

    // FALLBACK: Auto-create missing caller profile from auth metadata
    if (profileError || !callerProfile) {
      const { data: authUserData, error: adminAuthError } =
        await supabaseAdmin.auth.admin.getUserById(caller.id);

      if (adminAuthError || !authUserData?.user) {
        return new Response(
          JSON.stringify({
            error: "Unable to retrieve caller authentication info.",
          }),
          {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const authUser = authUserData.user;
      const authRole =
        authUser.app_metadata?.app_role || authUser.user_metadata?.role;
      const authVenueId =
        authUser.app_metadata?.app_venue_id || authUser.user_metadata?.venue_id;

      if (!authRole || (authRole !== "super_admin" && !authVenueId)) {
        return new Response(
          JSON.stringify({
            error: "Caller profile not found. Please contact an administrator.",
          }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const { data: createdProfile, error: createProfileError } =
        await ensurePublicProfile(
          supabaseAdmin,
          caller.id,
          authUser.email ?? "",
          {
            name:
              authUser.user_metadata?.name ||
              authUser.email?.split("@")[0] ||
              "User",
            role: authRole,
            venue_id: authVenueId || null,
            guest_limit:
              authUser.user_metadata?.guest_limit ||
              (authRole === "venue_admin" ? 999 : 10),
            active: true,
          },
        );

      if (createProfileError || !createdProfile) {
        return new Response(
          JSON.stringify({
            error:
              "Failed to auto-create profile: " +
              (createProfileError?.message || "Unknown error"),
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      callerProfile = createdProfile;
    }

    const body = await req.json();

    // ---- DELETE USER ----
    if (body.action === "delete") {
      const { userId } = body;

      if (!userId) {
        return new Response(JSON.stringify({ error: "userId is required." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (
        callerProfile.role !== "super_admin" &&
        callerProfile.role !== "venue_admin"
      ) {
        return new Response(JSON.stringify({ error: "Permission denied." }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: targetUser, error: fetchError } = await supabaseAdmin
        .from("users")
        .select("auth_user_id, venue_id")
        .eq("id", userId)
        .single();

      if (fetchError || !targetUser) {
        console.error("Failed to fetch target user:", fetchError);
        return new Response(JSON.stringify({ error: "User not found." }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (
        callerProfile.role === "venue_admin" &&
        targetUser.venue_id !== callerProfile.venue_id
      ) {
        return new Response(
          JSON.stringify({ error: "Cannot delete users from another venue." }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Delete auth user first (cascade may delete public.users row)
      if (targetUser.auth_user_id) {
        const { error: deleteError } =
          await supabaseAdmin.auth.admin.deleteUser(targetUser.auth_user_id);
        if (deleteError) {
          console.error("Failed to delete auth user:", deleteError);
          // If auth user is already gone (e.g. previously deleted), continue to clean up profile
          if (!deleteError.message?.includes("not found")) {
            throw deleteError;
          }
        }
      }

      // Also delete public.users row in case cascade doesn't fire
      const { error: profileDeleteError } = await supabaseAdmin
        .from("users")
        .delete()
        .eq("id", userId);
      if (profileDeleteError) {
        console.error("Failed to delete public.users row:", profileDeleteError);
        // Not a fatal error — auth user is already gone
      }

      return new Response(JSON.stringify({ message: "User deleted." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- RESEND INVITE ----
    if (body.action === "resend-invite") {
      const { userId } = body;

      if (!userId) {
        return new Response(JSON.stringify({ error: "userId is required." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (
        callerProfile.role !== "super_admin" &&
        callerProfile.role !== "venue_admin"
      ) {
        return new Response(JSON.stringify({ error: "Permission denied." }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: targetUser, error: fetchError } = await supabaseAdmin
        .from("users")
        .select("email, venue_id, name, role, guest_limit")
        .eq("id", userId)
        .single();

      if (fetchError || !targetUser) {
        console.error("Failed to fetch target user:", fetchError);
        return new Response(JSON.stringify({ error: "User not found." }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (
        callerProfile.role === "venue_admin" &&
        targetUser.venue_id !== callerProfile.venue_id
      ) {
        return new Response(
          JSON.stringify({ error: "Cannot invite users from another venue." }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const userData = {
        name: targetUser.name,
        role: targetUser.role,
        venue_id: targetUser.venue_id,
        guest_limit: targetUser.guest_limit,
      };

      const result = await supabaseAdmin.auth.admin.inviteUserByEmail(
        targetUser.email,
        {
          data: userData,
          redirectTo: `${req.headers.get("origin") || Deno.env.get("SITE_URL") || ""}/auth/reset-password`,
        },
      );

      if (result.error) {
        return new Response(JSON.stringify({ error: result.error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({ message: "Invitation resent successfully." }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // ---- CREATE USER ----
    const { email, name, role, venueId, guestLimit, password } = body;

    // Validate required fields
    if (!email || !name || !role) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields. (email, name, role)",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    if (role !== "super_admin" && !venueId) {
      return new Response(
        JSON.stringify({
          error: "venueId is required for roles other than super_admin.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Permission checks
    const allowedRoles = ["super_admin", "venue_admin"];
    if (!allowedRoles.includes(callerProfile.role)) {
      return new Response(
        JSON.stringify({
          error: "You do not have permission to create users.",
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (callerProfile.role === "venue_admin") {
      if (venueId !== callerProfile.venue_id) {
        return new Response(
          JSON.stringify({ error: "Cannot create users in another venue." }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      if (role === "super_admin") {
        return new Response(
          JSON.stringify({ error: "Cannot create a super admin user." }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    // Check for duplicate email BEFORE creating auth user
    const { data: existingUsers } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", email)
      .limit(1);

    if (existingUsers && existingUsers.length > 0) {
      return new Response(
        JSON.stringify({ error: "Email is already registered." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const userData = {
      name,
      role,
      venue_id: venueId ?? null,
      guest_limit: guestLimit ?? 10,
    };

    let newAuthUser: any;
    let createError: any;
    let successMessage: string;
    const isInviteMode = !password;

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
      });
      newAuthUser = result.data;
      createError = result.error;
      successMessage = `Account created. Temporary password: ${password}`;
    } else {
      // ---- MODE B: Invite by email (classic flow) ----
      const result = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: userData,
        redirectTo: `${req.headers.get("origin") || Deno.env.get("SITE_URL") || ""}/auth/reset-password`,
      });
      newAuthUser = result.data;
      createError = result.error;
      successMessage = "Invitation email sent.";
    }

    if (createError) {
      if (
        createError.message?.includes("already been registered") ||
        createError.message?.includes("already exists")
      ) {
        return new Response(
          JSON.stringify({ error: "Email is already registered." }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      throw createError;
    }

    if (!newAuthUser?.user?.id) {
      throw new Error("Auth user was created but ID could not be retrieved.");
    }

    const authUserId = newAuthUser.user.id;

    // Always set app_metadata explicitly (trigger may set it, but we ensure correctness)
    await supabaseAdmin.auth.admin.updateUserById(authUserId, {
      app_metadata: {
        app_role: role,
        app_venue_id: venueId ?? null,
      },
    });

    // Wait for trigger to potentially create public.users, then ensure it exists
    await new Promise((resolve) => setTimeout(resolve, 800));

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
      },
    );

    if (profileError2) {
      // Auth user was created but profile failed → clean up auth user to avoid orphan
      console.error(
        "Failed to create profile, cleaning up auth user:",
        profileError2,
      );
      await supabaseAdmin.auth.admin.deleteUser(authUserId);
      return new Response(
        JSON.stringify({
          error: "Failed to create user profile: " + profileError2.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({
        message: successMessage,
        user: newUser,
        tempPassword: password || undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Create user error:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "An error occurred while creating the user.",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
