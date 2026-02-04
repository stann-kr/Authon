import { supabase } from '../supabase';

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
  venueId: string;
  email: string;
  name: string;
  role: 'admin' | 'door' | 'dj';
  guestLimit: number;
  active: boolean;
}

export interface Guest {
  id: string;
  venueId: string;
  name: string;
  djId?: string | null;
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

// Transform database row to frontend format
const transformVenue = (row: any): Venue => ({
  id: row.id,
  name: row.name,
  type: row.type,
  address: row.address,
  description: row.description,
  active: row.active,
});

// Transform database row to frontend format
const transformUser = (row: any): User => ({
  id: row.id,
  venueId: row.venue_id,
  email: row.email,
  name: row.name,
  role: row.role,
  guestLimit: row.guest_limit,
  active: row.active,
});

// Transform database row to frontend format
const transformGuest = (row: any): Guest => ({
  id: row.id,
  venueId: row.venue_id,
  name: row.name,
  djId: row.dj_id,
  status: row.status,
  checkInTime: row.check_in_time,
  date: row.date,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

// Transform database row to frontend format
const transformDJ = (row: any): DJ => ({
  id: row.id,
  venueId: row.venue_id,
  userId: row.user_id,
  name: row.name,
  event: row.event,
  active: row.active,
});

/**
 * Fetch all venues
 */
export async function fetchVenues(): Promise<{ data: Venue[] | null; error: any }> {
  const { data, error } = await supabase
    .from('venues')
    .select('*')
    .eq('active', true)
    .order('name', { ascending: true });

  if (error) return { data: null, error };

  return { data: data.map(transformVenue), error: null };
}

/**
 * Authenticate user and fetch their info
 */
export async function loginUser(email: string, password: string): Promise<{ data: User | null; error: any }> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .eq('password_hash', password) // 실제로는 해시 비교 필요
    .eq('active', true)
    .single();

  if (error) return { data: null, error };

  return { data: transformUser(data), error: null };
}

/**
 * Fetch users by venue (for admin)
 */
export async function fetchUsersByVenue(venueId: string): Promise<{ data: User[] | null; error: any }> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('venue_id', venueId)
    .order('name', { ascending: true });

  if (error) return { data: null, error };

  return { data: data.map(transformUser), error: null };
}

/** (all venues)
 */
export async function fetchGuestsByDate(date: string): Promise<{ data: Guest[] | null; error: any }> {
  const { data, error } = await supabase
    .from('guests')
    .select('*')
    .eq('date', date)
    .order('created_at', { ascending: false });

  if (error) return { data: null, error };

  return { data: data.map(transformGuest), error: null };
}

/**
 * Fetch all guests (optionally filtered by venue)
 */
export async function fetchAllGuests(venueId?: string): Promise<{ data: Guest[] | null; error: any }> {
  let query = supabase
    .from('guests')
    .select('*');

  if (venueId) {
    query = query.eq('venue_id', venueId);
  }

  const { data, error } = await query
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) return { data: null, error };

  return { data: data.map(transformGuest), error: null };
}

/**
 * Fetch guests by DJ ID
 */
export async function fetchGuestsByDJ(djId: string, date?: string): Promise<{ data: Guest[] | null; error: any }> {
  let query = supabase
    .from('guests')
    .select('*')
    .eq('dj_id', djId);

  if (date) {
    query = query.eq('date', date);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) return { data: null, error };

  return { data: data.map(transformGuest), error: null };
}

/**
 * Create a new guest
 */
export async function createGuest(guest: {
  venueId: string;
  name: string;
  djId?: string | null;
  date: string;
  status?: 'pending' | 'checked' | 'deleted';
}): Promise<{ data: Guest | null; error: any }> {
  const { data, error } = await supabase
    .from('guests')
    .insert({
      venue_id: guest.venueId,
  if (error) return { data: null, error };

  return { data: data.map(transformGuest), error: null };
}

/**
 * Fetch guests by DJ ID
 */
export async function fetchGuestsByDJ(djId: string, date?: string): Promise<{ data: Guest[] | null; error: any }> {
  let query = supabase
    .from('guests')
    .select('*')
    .eq('dj_id', djId);

  if (date) {
    query = query.eq('date', date);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) return { data: null, error };

  return { data: data.map(transformGuest), error: null };
}

/**
 * Create a new guest
 */
export async function createGuest(guest: {
  name: string;
  djId?: string | null;
  date: string;
  status?: 'pending' | 'checked' | 'deleted';
}): Promise<{ data: Guest | null; error: any }> {
  const { data, error } = await supabase
    .from('guests')
    .insert({
      name: guest.name,
      dj_id: guest.djId || null,
      date: guest.date,
      status: guest.status || 'pending',
    })
    .select()
    .single();

  if (error) return { data: null, error };

  return { data: transformGuest(data), error: null };
}

/**
 * Update guest status
 */
export async function updateGuestStatus(
  guestId: string,
  status: 'pending' | 'checked' | 'deleted'
): Promise<{ data: Guest | null; error: any }> {
  const updateData: any = { status };

  // If checking in, set check_in_time
  if (status === 'checked') {
    updateData.check_in_time = new Date().toISOString();
  } else if (status === 'pending') {
    // If resetting to pending, clear check_in_time
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

/**
 * Delete a guest (soft delete by updating status)
 */
export async function deleteGuest(guestId: string): Promise<{ data: Guest | null; error: any }> {
  return updateGuestStatus(guestId, 'deleted');
}

/**
 * Permanently delete a guest from database
 */
export async function permanentlyDeleteGuest(guestId: string): Promise<{ error: any }> {
  const { error } = await supabase
    .from('guests')
    .delete()
    .eq('id', guestId);

  return { error };
}
venueId?: string;
    djId?: string | null;
    date?: string;
  }
): Promise<{ data: Guest | null; error: any }> {
  const updateData: any = {};

  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.venueId !== undefined) updateData.venue_id = updates.venueId
    name?: string;
    djId?: string | null;
    date?: string;
  }
): Promise<{ data: Guest | null; error: any }> {
  const updateData: any = {};

  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.djId !== undefined) updateData.dj_id = updates.djId;
  if (updates.date !== undefined) updateData.date = updates.date;

  const { data, error } = await supabase
    .from('guests')
    .update(updateData)
    .eq('id', guestId)
    .select()
    .single();

  if (error) return { data: null, error };

  return { data: transformGuest(data), error: null };
}
