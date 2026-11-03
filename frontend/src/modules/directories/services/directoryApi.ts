import { apiSlice } from '@/store/apiSlice';
import { Directory } from '@/types/auth';

export interface CreateDirectoryRequest {
  name: string;
  code: string;
  short_name?: string;
  amharic_name?: string;
  description?: string;
  head_user_id?: number | null;
  parent_id?: number | null;
}

export interface DirectoryUser {
  user_id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  role_id: number;
  role_name: string;
  account_status: string;
}

export const directoryApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getDirectoriesList: builder.query<{ success: boolean; data: Directory[] }, { q?: string; is_active?: boolean } | void>({
      query: (params) => {
        const q = new URLSearchParams();
        if (params?.q) q.set('q', params.q);
        if (params?.is_active !== undefined) q.set('is_active', String(params.is_active));
        return `/directories?${q.toString()}`;
      },
      providesTags: ['Directories'],
    }),

    getDirectoryTree: builder.query<{ success: boolean; data: any[] }, void>({
      query: () => '/directories/tree',
      providesTags: ['Directories'],
    }),

    getDirectoryById: builder.query<{ success: boolean; data: Directory }, number>({
      query: (id) => `/directories/${id}`,
      providesTags: (_res, _err, id) => [{ type: 'Directories', id }],
    }),

    createDirectory: builder.mutation<{ success: boolean; data: Directory }, CreateDirectoryRequest>({
      query: (body) => ({
        url: '/directories',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Directories'],
    }),

    updateDirectory: builder.mutation<{ success: boolean; data: Directory }, { id: number; data: Partial<CreateDirectoryRequest> }>({
      query: ({ id, data }) => ({
        url: `/directories/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['Directories'],
    }),

    deactivateDirectory: builder.mutation<{ success: boolean; message: string }, number>({
      query: (id) => ({
        url: `/directories/${id}/deactivate`,
        method: 'POST',
      }),
      invalidatesTags: ['Directories'],
    }),

    getDirectoryUsers: builder.query<{ success: boolean; data: DirectoryUser[] }, number>({
      query: (id) => `/directories/${id}/users`,
      providesTags: (_res, _err, id) => [{ type: 'Directories', id }],
    }),
  }),
});

export const {
  useGetDirectoriesListQuery,
  useGetDirectoryTreeQuery,
  useGetDirectoryByIdQuery,
  useCreateDirectoryMutation,
  useUpdateDirectoryMutation,
  useDeactivateDirectoryMutation,
  useGetDirectoryUsersQuery,
} = directoryApi;
