import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL and Anon Key are required. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false, // 정적 빌드에서는 세션 유지 불필요
  },
});

// Type definitions for database tables
export interface Database {
  public: {
    Tables: {
      venues: {
        Row: {
          id: string;
          name: string;
          type: 'club' | 'bar' | 'lounge' | 'festival' | 'private';
          address: string | null;
          description: string | null;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          type?: 'club' | 'bar' | 'lounge' | 'festival' | 'private';
          address?: string | null;
          description?: string | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          type?: 'club' | 'bar' | 'lounge' | 'festival' | 'private';
          address?: string | null;
          description?: string | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      users: {
        Row: {
          id: string;
          venue_id: string;
          email: string;
          password_hash: string;
          name: string;
          role: 'admin' | 'door' | 'dj';
          guest_limit: number;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          venue_id: string;
          email: string;
          password_hash: string;
          name: string;
          role: 'admin' | 'door' | 'dj';
          guest_limit?: number;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          venue_id?: string;
          email?: string;
          password_hash?: string;
          name?: string;
          role?: 'admin' | 'door' | 'dj';
          guest_limit?: number;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      djs: {
        Row: {
          id: string;
          venue_id: string;
          user_id: string | null;
          name: string;
          event: string;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          venue_id: string;
          user_id?: string | null;
          name: string;
          event: string;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          venue_id?: string;
          user_id?: string | null;
          name?: string;
          event?: string;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      guests: {
        Row: {
          id: string;
          venue_id: string;
          name: string;
          dj_id: string | null;
          status: 'pending' | 'checked' | 'deleted';
          check_in_time: string | null;
          date: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          venue_id: string;
          name: string;
          dj_id?: string | null;
          status?: 'pending' | 'checked' | 'deleted';
          check_in_time?: string | null;
          date: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          venue_id?: string;
          name?: string;
          dj_id?: string | null;
          status?: 'pending' | 'checked' | 'deleted';
          check_in_time?: string | null;
          date?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}
