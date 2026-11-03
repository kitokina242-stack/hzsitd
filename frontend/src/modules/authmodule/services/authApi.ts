import { apiSlice } from '@/store/apiSlice';
import { User, Directory, UserRole } from '@/types/auth';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  data: {
    access_token: string;
    refresh_token: string;
    token_type: string;
    expires_in: number;
  };
}

export interface RegisterRequest {
  employee_number?: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  password: string;
}

export interface RegisterResponse {
  success: boolean;
  data: {
    user_id: number;
    employee_number?: string;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    account_status: 'pending' | 'active' | 'suspended' | 'deactivated';
    created_at: string;
  };
}

export interface MeResponse {
  success: boolean;
  data: {
    user: {
      user_id: number;
      employee_number?: string;
      first_name: string;
      last_name: string;
      email: string;
      phone?: string;
      account_status: string;
      created_at: string;
    };
    role_assignments: Array<{
      role_id: number;
      directory_id: number;
      role_name?: string;
      directory_name?: string;
    }>;
    permissions: string[];
  };
}

export interface UpdateProfileRequest {
  first_name?: string;
  last_name?: string;
  phone?: string;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

export const authApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<LoginResponse, LoginRequest>({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
      invalidatesTags: ['Users', 'Stats'],
    }),

    register: builder.mutation<RegisterResponse, RegisterRequest>({
      query: (userData) => ({
        url: '/auth/register',
        method: 'POST',
        body: userData,
      }),
      invalidatesTags: ['Users'],
    }),

    getMe: builder.query<MeResponse, void>({
      query: () => '/auth/me',
      providesTags: ['Users'],
    }),

    updateMe: builder.mutation<{ success: boolean; data: any }, UpdateProfileRequest>({
      query: (profileData) => ({
        url: '/auth/me',
        method: 'PATCH',
        body: profileData,
      }),
      invalidatesTags: ['Users'],
    }),

    changePassword: builder.mutation<{ success: boolean; message: string }, ChangePasswordRequest>({
      query: (passwords) => ({
        url: '/auth/change-password',
        method: 'POST',
        body: passwords,
      }),
    }),

    refreshToken: builder.mutation<LoginResponse, { refresh_token: string }>({
      query: (body) => ({
        url: '/auth/refresh',
        method: 'POST',
        body,
      }),
    }),

    getCurrentUser: builder.query<{ success: boolean; user: User }, void>({
      query: () => '/auth/current-user',
      providesTags: ['Users'],
    }),

    getUsers: builder.query<{ success: boolean; data?: any[]; users?: User[] }, void>({
      query: () => '/users',
      providesTags: ['Users'],
    }),

    getDirectories: builder.query<{ success: boolean; data?: any[]; directories?: Directory[] }, void>({
      query: () => '/directories',
      providesTags: ['Directories'],
    }),

    switchRole: builder.mutation<{ success: boolean; user: User }, { username?: string; role?: UserRole }>({
      query: (body) => ({
        url: '/auth/switch-role',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Users', 'Letters', 'Stats'],
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useGetMeQuery,
  useLazyGetMeQuery,
  useUpdateMeMutation,
  useChangePasswordMutation,
  useRefreshTokenMutation,
  useGetCurrentUserQuery,
  useGetUsersQuery,
  useGetDirectoriesQuery,
  useSwitchRoleMutation,
} = authApi;
