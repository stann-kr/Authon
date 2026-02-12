import { createClient } from '../supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';

const supabase = createClient() as SupabaseClient<any, "public", any>;

// ============================================================
// Types
// ============================================================

export interface Venue {
  id: string;
  name: string;
  type: 'club' | 'bar' | 'lounge' | 'festival' | 'private';
  address?: string | null;
  description?: string | null;
  active: boolean;
}

export interface User {
  id: string;
  authUserId: string | null;
  venueId: string | null;  // null for super_admin (platform-wide)
  email: string;
  name: string;
  role: 'super_admin' | 'venue_admin' | 'door' | 'dj';
  guestLimit: number;
  active: boolean;
}

export interface Guest {
  id: string;
  venueId: string;
  name: string;
  djId?: string | null;
  externalLinkId?: string | null;
  status: 'pending' | 'checked' | 'deleted';
  checkInTime?: string | null;
  date: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DJ {
  id: string;
  venueId: string;
  userId?: string | null;
  name: string;
  event: string;
  active: boolean;
}

export interface ExternalDJLink {
  id: string;
  venueId: string;
  token: string;
  djName: string;
  event: string;
  date: string;
  maxGuests: number;
  usedGuests: number;
  active: boolean;
  expiresAt?: string | null;
  createdBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

// ============================================================
// Transform helpers (snake_case → camelCase)
// ============================================================

const transformVenue = (row: any): Venue => ({
  id: row.id,
  name: row.name,
  type: row.type,
  address: row.address,
  description: row.description,
  active: row.active,
});

const transformUser = (row: any): User => ({
  id: row.id,
  authUserId: row.auth_user_id,
  venueId: row.venue_id,
  email: row.email,
  name: row.name,
  role: row.role,
  guestLimit: row.guest_limit,
  active: row.active,
});

const transformGuest = (row: any): Guest => ({
  id: row.id,
  venueId: row.venue_id,
  name: row.name,
  djId: row.dj_id,
  externalLinkId: row.external_link_id,
  status: row.status,
  checkInTime: row.check_in_time,
  date: row.date,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const transformDJ = (row: any): DJ => ({
  id: row.id,
  venueId: row.venue_id,
  userId: row.user_id,
  name: row.name,
  event: row.event,
  active: row.active,
});

const transformExternalLink = (row: any): ExternalDJLink => ({
  id: row.id,
  venueId: row.venue_id,
  token: row.token,
  djName: row.dj_name,
  event: row.event,
  date: row.date,
  maxGuests: row.max_guests,
  usedGuests: row.used_guests,
  active: row.active,
  expiresAt: row.expires_at,
  createdBy: row.created_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

// ============================================================
// Venue APIs
// ============================================================

export async function fetchVenues(): Promise<{ data: Venue[] | null; error: any }> {
  const { data, error } = await supabase
    .from('venues')
    .select('*')
    .eq('active', true)
    .order('name', { ascending: true });

  if (error) return { data: null, error };
  return { data: data.map(transformVenue), error: null };
}

// ============================================================
// User APIs (read via RLS, create/delete via Edge Functions)
// ============================================================

/**
 * Fetch users. If venueId is provided, filter by venue.
 * If venueId is omitted (super_admin view), fetch all users.
 */
export async function fetchUsersByVenue(venueId?: string | null): Promise<{ data: User[] | null; error: any }> {
  let query = supabase
    .from('users')
    .select('*');

  if (venueId) {
    query = query.eq('venue_id', venueId);
  }

  const { data, error } = await query.order('name', { ascending: true });

  if (error) return { data: null, error };
  return { data: data.map(transformUser), error: null };
}

export async function updateUserProfile(
  userId: string,
  updates: { name?: string; guestLimit?: number; active?: boolean; role?: string }
): Promise<{ data: User | null; error: any }> {
  const updateData: any = {};
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.guestLimit !== undefined) updateData.guest_limit = updates.guestLimit;
  if (updates.active !== undefined) updateData.active = updates.active;
  if (updates.role !== undefined) updateData.role = updates.role;

  const { data, error } = await supabase
    .from('users')
    .update(updateData)
    .eq('id', userId)
    .select()
    .single();

  if (error) return { data: null, error };
  return { data: transformUser(data), error: null };
}

/**
 * Create a new user via Edge Function (requires service_role for auth.admin.createUser)
 * Called by super_admin or venue_admin
 */
export async function createUserViaEdge(params: {
  email: string;
  password: string;
  name: string;
  role: 'super_admin' | 'venue_admin' | 'door' | 'dj';
  venueId?: string | null;  // optional for super_admin role
  guestLimit?: number;
}): Promise<{ data: any; error: any }> {
  const { data, error } = await supabase.functions.invoke('create-user', {
    body: params,
  });

  if (error) return { data: null, error };
  return { data, error: null };
}

/**
 * Delete/deactivate a user via Edge Function
 */
export async function deleteUserViaEdge(userId: string): Promise<{ error: any }> {
  const { error } = await supabase.functions.invoke('create-user', {
    body: { action: 'delete', userId },
  });
  return { error };
}

// ============================================================
// DJ APIs
// ============================================================

export async function fetchDJsByVenue(venueId: string): Promise<{ data: DJ[] | null; error: any }> {
  const { data, error } = await supabase
    .from('djs')
    .select('*')
    .eq('venue_id', venueId)
    .eq('active', true)
    .order('name', { ascending: true });

  if (error) return { data: null, error };
  return { data: data.map(transformDJ), error: null };
}

export async function createDJ(dj: {
  venueId: string;
  name: string;
  event: string;
  userId?: string;
}): Promise<{ data: DJ | null; error: any }> {
  const { data, error } = await supabase
    .from('djs')
    .insert({
      venue_id: dj.venueId,
      name: dj.name,
      event: dj.event,
      user_id: dj.userId || null,
    })
    .select()
    .single();

  if (error) return { data: null, error };
  return { data: transformDJ(data), error: null };
}

// ============================================================
// Guest APIs
// ============================================================

export async function fetchGuestsByDate(date: string, venueId?: string): Promise<{ data: Guest[] | null; error: any }> {
  let query = supabase
    .from('guests')
    .select('*')
    .eq('date', date)
    .neq('status', 'deleted');

  if (venueId) {
    query = query.eq('venue_id', venueId);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) return { data: null, error };
  return { data: data.map(transformGuest), error: null };
}

export async function fetchAllGuests(venueId?: string): Promise<{ data: Guest[] | null; error: any }> {
  let query = supabase.from('guests').select('*');

  if (venueId) {
    query = query.eq('venue_id', venueId);
  }

  const { data, error } = await query
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) return { data: null, error };
  return { data: data.map(transformGuest), error: null };
}

export async function fetchGuestsByDJ(djId: string, date?: string): Promise<{ data: Guest[] | null; error: any }> {
  let query = supabase
    .from('guests')
    .select('*')
    .eq('dj_id', djId)
    .neq('status', 'deleted');

  if (date) {
    query = query.eq('date', date);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) return { data: null, error };
  return { data: data.map(transformGuest), error: null };
}

export async function createGuest(guest: {
  venueId: string;
  name: string;
  djId?: string | null;
  externalLinkId?: string | null;
  date: string;
  status?: 'pending' | 'checked' | 'deleted';
}): Promise<{ data: Guest | null; error: any }> {
  const { data, error } = await supabase
    .from('guests')
    .insert({
      venue_id: guest.venueId,
      name: guest.name,
      dj_id: guest.djId || null,
      external_link_id: guest.externalLinkId || null,
      date: guest.date,
      status: guest.status || 'pending',
    })
    .select()
    .single();

  if (error) return { data: null, error };
  return { data: transformGuest(data), error: null };
}

export async function updateGuestStatus(
  guestId: string,
  status: 'pending' | 'checked' | 'deleted'
): Promise<{ data: Guest | null; error: any }> {
  const updateData: any = { status };

  if (status === 'checked') {
    updateData.check_in_time = new Date().toISOString();
  } else if (status === 'pending') {
    updateData.check_in_time = null;
  }

  const { data, error } = await supabase
    .from('guests')
    .update(updateData)
    .eq('id', guestId)
    .select()
    .single();

  if (error) return { data: null, error };
  return { data: transformGuest(data), error: null };
}

export async function deleteGuest(guestId: string): Promise<{ data: Guest | null; error: any }> {
  return updateGuestStatus(guestId, 'deleted');
}

export async function permanentlyDeleteGuest(guestId: string): Promise<{ error: any }> {
  const { error } = await supabase
    .from('guests')
    .delete()
    .eq('id', guestId);
  return { error };
}

export async function updateGuest(
  guestId: string,
  updates: { name?: string; djId?: string | null; date?: string; venueId?: string }
): Promise<{ data: Guest | null; error: any }> {
  const updateData: any = {};
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.djId !== undefined) updateData.dj_id = updates.djId;
  if (updates.date !== undefined) updateData.date = updates.date;
  if (updates.venueId !== undefined) updateData.venue_id = updates.venueId;

  const { data, error } = await supabase
    .from('guests')
    .update(updateData)
    .eq('id', guestId)
    .select()
    .single();

  if (error) return { data: null, error };
  return { data: transformGuest(data), error: null };
}

// ============================================================
// External DJ Link APIs
// ============================================================

export async function fetchExternalLinks(venueId: string): Promise<{ data: ExternalDJLink[] | null; error: any }> {
  const { data, error } = await supabase
    .from('external_dj_links')
    .select('*')
    .eq('venue_id', venueId)
    .order('date', { ascending: false });

  if (error) return { data: null, error };
  return { data: data.map(transformExternalLink), error: null };
}

export async function fetchExternalLinksByDate(venueId: string, date: string): Promise<{ data: ExternalDJLink[] | null; error: any }> {
  const { data, error } = await supabase
    .from('external_dj_links')
    .select('*')
    .eq('venue_id', venueId)
    .eq('date', date)
    .order('created_at', { ascending: false });

  if (error) return { data: null, error };
  return { data: data.map(transformExternalLink), error: null };
}

export async function createExternalLink(link: {
  venueId: string;
  djName: string;
  event: string;
  date: string;
  maxGuests: number;
  createdBy?: string;
}): Promise<{ data: ExternalDJLink | null; error: any }> {
  const { data, error } = await supabase
    .from('external_dj_links')
    .insert({
      venue_id: link.venueId,
      dj_name: link.djName,
      event: link.event,
      date: link.date,
      max_guests: link.maxGuests,
      created_by: link.createdBy || null,
    })
    .select()
    .single();

  if (error) return { data: null, error };
  return { data: transformExternalLink(data), error: null };
}

export async function deleteExternalLink(linkId: string): Promise<{ error: any }> {
  const { error } = await supabase
    .from('external_dj_links')
    .delete()
    .eq('id', linkId);
  return { error };
}

export async function deactivateExternalLink(linkId: string): Promise<{ error: any }> {
  const { error } = await supabase
    .from('external_dj_links')
    .update({ active: false })
    .eq('id', linkId);
  return { error };
}

/**
 * Validate an external DJ link token via Edge Function
 * (no auth required — public endpoint)
 */
export async function validateExternalToken(token: string): Promise<{
  data: { link: ExternalDJLink; venue: Venue } | null;
  error: any;
}> {
  const { data, error } = await supabase.functions.invoke('external-dj-links', {
    body: { action: 'validate', token },
  });

  if (error) return { data: null, error };
  if (data?.error) return { data: null, error: data.error };
  return { data, error: null };
}

/**
 * Create a guest via external DJ link (no auth, via Edge Function)
 */
export async function createGuestViaExternalLink(params: {
  token: string;
  guestName: string;
  date: string;
}): Promise<{ data: Guest | null; error: any }> {
  const { data, error } = await supabase.functions.invoke('external-dj-links', {
    body: { action: 'create-guest', ...params },
  });

  if (error) return { data: null, error };
  if (data?.error) return { data: null, error: data.error };
  return { data: data?.guest ? transformGuest(data.guest) : null, error: null };
}
