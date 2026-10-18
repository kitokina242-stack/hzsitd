export type UserRole = 'Department Head' | 'Directory Lead' | 'Officer' | 'System Admin';

export interface User {
  id: number;
  full_name: string;
  username: string;
  email: string;
  phone?: string;
  role: UserRole;
  directory_id?: number;
  directory_name?: string;
  position_title: string;
  avatar_url?: string;
  signature_url?: string;
  stamp_url?: string;
}

export interface Directory {
  id: number;
  name: string;
  short_name: string;
  code: string;
  amharic_name?: string;
  description?: string;
  head_user_id?: number;
  created_at?: string;
}

export interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  activeRole: UserRole;
}
