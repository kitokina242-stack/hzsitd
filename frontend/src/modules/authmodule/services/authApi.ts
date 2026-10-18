import { apiSlice } from '@/store/apiSlice';
import { User, Directory, UserRole } from '@/types/auth';

export const authApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getCurrentUser: builder.query<{ success: boolean; user: User }, void>({
      query: () => '/auth/current-user',
      providesTags: ['Users'],
    }),
    getUsers: builder.query<{ success: boolean; users: User[] }, void>({
      query: () => '/users',
      providesTags: ['Users'],
    }),
    getDirectories: builder.query<{ success: boolean; directories: Directory[] }, void>({
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
    login: builder.mutation<{ success: boolean; token: string; user: User }, { username: string }>({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
      invalidatesTags: ['Users', 'Stats'],
    }),
  }),
});

export const {
  useGetCurrentUserQuery,
  useGetUsersQuery,
  useGetDirectoriesQuery,
  useSwitchRoleMutation,
  useLoginMutation,
} = authApi;
