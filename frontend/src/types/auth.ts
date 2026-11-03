export type UserRole = 'Department Head' | 'Directory Lead' | 'Officer' | 'System Admin';

export type AccountStatus = 'pending' | 'active' | 'suspended' | 'deactivated';

export interface RoleAssignment {
  role_id: number;
  directory_id: number;
  role_name?: string;
  directory_name?: string;
}

export interface User {
  id: number;
  user_id?: number;
  employee_number?: string;
  first_name?: string;
  last_name?: string;
  full_name: string;
  username: string;
  email: string;
  phone?: string;
  role: UserRole;
  directory_id?: number;
  directory_name?: string;
  position_title: string;
  account_status?: AccountStatus;
  role_assignments?: RoleAssignment[];
  permissions?: string[];
  avatar_url?: string;
  signature_url?: string;
  stamp_url?: string;
}

export interface Directory {
  id: number;
  directory_id?: number;
  name: string;
  short_name: string;
  code: string;
  amharic_name?: string;
  description?: string;
  head_user_id?: number;
  parent_id?: number | null;
  is_active?: boolean;
  created_at?: string;
}

export interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: User | null;
  isAuthenticated: boolean;
  activeRole: UserRole;
  activeDirectoryId?: number;
}
