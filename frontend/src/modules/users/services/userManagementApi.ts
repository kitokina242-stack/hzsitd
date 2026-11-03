import { apiSlice } from '@/store/apiSlice';
import { User, UserRole, AccountStatus } from '@/types/auth';

export interface CreateAdminUserRequest {
  employee_number?: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  password: string;
  account_status?: AccountStatus;
  initial_role_id?: number;
  initial_directory_id?: number;
}

export interface Role {
  role_id: number;
  role_name: string;
  description?: string;
}

export const userManagementApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getAdminUsersList: builder.query<{ success: boolean; data: any[] }, { q?: string; account_status?: string; directory_id?: number } | void>({
      query: (params) => {
        const q = new URLSearchParams();
        if (params?.q) q.set('q', params.q);
        if (params?.account_status) q.set('account_status', params.account_status);
        if (params?.directory_id) q.set('directory_id', String(params.directory_id));
        return `/users?${q.toString()}`;
      },
      providesTags: ['Users'],
    }),

    createAdminUser: builder.mutation<{ success: boolean; data: any }, CreateAdminUserRequest>({
      query: (body) => ({
        url: '/users',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Users'],
    }),

    updateAdminUser: builder.mutation<{ success: boolean; data: any }, { id: number; data: Partial<CreateAdminUserRequest> }>({
      query: ({ id, data }) => ({
        url: `/users/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['Users'],
    }),

    setUserStatus: builder.mutation<{ success: boolean; data: any }, { user_id: number; account_status: AccountStatus }>({
      query: ({ user_id, account_status }) => ({
        url: `/users/${user_id}/status`,
        method: 'POST',
        body: { account_status },
      }),
      invalidatesTags: ['Users'],
    }),

    resetUserPasswordByAdmin: builder.mutation<{ success: boolean; message: string }, { user_id: number; new_password: string }>({
      query: ({ user_id, new_password }) => ({
        url: `/users/${user_id}/reset-password`,
        method: 'POST',
        body: { new_password },
      }),
    }),

    getRolesList: builder.query<{ success: boolean; data: Role[] }, void>({
      query: () => '/roles',
    }),
  }),
});

export const {
  useGetAdminUsersListQuery,
  useCreateAdminUserMutation,
  useUpdateAdminUserMutation,
  useSetUserStatusMutation,
  useResetUserPasswordByAdminMutation,
  useGetRolesListQuery,
} = userManagementApi;
