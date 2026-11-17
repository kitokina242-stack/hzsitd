import { apiSlice } from '@/store/apiSlice';
import { Directory } from '@/types/auth';

export interface CreateDirectoryRequest {
  name?: string;
  code?: string;
  directory_name?: string;
  directory_code?: string;
  short_name?: string;
  amharic_name?: string;
  description?: string;
  head_user_id?: number | null;
  parent_id?: number | null;
  parent_directory_id?: number | null;
  is_active?: boolean;
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

function normalizeDirectory(d: any): Directory {
  const id = Number(d?.id ?? d?.directory_id);
  const name = d?.name || d?.directory_name || `Directorate #${id}`;
  const code = d?.code || d?.directory_code || d?.short_name || 'DIR';
  return {
    ...d,
    id,
    directory_id: id,
    name,
    directory_name: name,
    code,
    directory_code: code,
    short_name: d?.short_name || d?.code || d?.directory_code || name,
    amharic_name: d?.amharic_name || undefined,
    description: d?.description || '',
    parent_id: d?.parent_id ?? d?.parent_directory_id ?? null,
    parent_directory_id: d?.parent_directory_id ?? d?.parent_id ?? null,
    is_active: d?.is_active !== false,
  };
}

export const directoryApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getDirectoriesList: builder.query<{ success: boolean; data: Directory[] }, { q?: string; is_active?: boolean } | void>({
      query: (params) => {
        const q = new URLSearchParams();
        if (params?.q) q.set('q', params.q);
        if (params?.is_active !== undefined) q.set('is_active', String(params.is_active));
        const qs = q.toString();
        return qs ? `/directories?${qs}` : '/directories';
      },
      transformResponse: (response: any) => {
        const rawList = Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response?.directories)
          ? response.directories
          : [];
        return {
          success: response?.success ?? true,
          data: rawList.map(normalizeDirectory),
        };
      },
      providesTags: ['Directories'],
    }),

    getDirectoryTree: builder.query<{ success: boolean; data: any[] }, void>({
      query: () => '/directories/tree',
      providesTags: ['Directories'],
    }),

    getDirectoryById: builder.query<{ success: boolean; data: Directory }, number>({
      query: (id) => `/directories/${id}`,
      transformResponse: (response: any) => {
        const raw = response?.data || response?.directory || response;
        return {
          success: response?.success ?? true,
          data: normalizeDirectory(raw),
        };
      },
      providesTags: (_res, _err, id) => [{ type: 'Directories', id }],
    }),

    createDirectory: builder.mutation<{ success: boolean; data: Directory }, CreateDirectoryRequest>({
      query: (body) => {
        const directory_name = (body.directory_name || body.name || '').trim();
        const directory_code = (body.directory_code || body.code || '').trim().toUpperCase();
        return {
          url: '/directories',
          method: 'POST',
          body: {
            directory_code,
            directory_name,
            description: (body.description || '').trim() || undefined,
            parent_directory_id: body.parent_directory_id ?? body.parent_id ?? null,
            // Dual compatibility
            name: directory_name,
            code: directory_code,
            short_name: (body.short_name || '').trim() || undefined,
            amharic_name: (body.amharic_name || '').trim() || undefined,
          },
        };
      },
      transformResponse: (response: any) => {
        const raw = response?.data || response?.directory || response;
        return {
          success: response?.success ?? true,
          data: normalizeDirectory(raw),
        };
      },
      invalidatesTags: ['Directories'],
    }),

    updateDirectory: builder.mutation<{ success: boolean; data: Directory }, { id: number; data: Partial<CreateDirectoryRequest> }>({
      query: ({ id, data }) => {
        const body: Record<string, any> = { ...data };
        if (data.name || data.directory_name) {
          const val = (data.directory_name || data.name || '').trim();
          body.directory_name = val;
          body.name = val;
        }
        if (data.code || data.directory_code) {
          const val = (data.directory_code || data.code || '').trim().toUpperCase();
          body.directory_code = val;
          body.code = val;
        }
        if (data.parent_id !== undefined && data.parent_directory_id === undefined) {
          body.parent_directory_id = data.parent_id;
        }
        return {
          url: `/directories/${id}`,
          method: 'PATCH',
          body,
        };
      },
      transformResponse: (response: any) => {
        const raw = response?.data || response?.directory || response;
        return {
          success: response?.success ?? true,
          data: normalizeDirectory(raw),
        };
      },
      invalidatesTags: ['Directories'],
    }),

    deactivateDirectory: builder.mutation<{ success: boolean; message?: string; data?: any }, number>({
      query: (id) => ({
        url: `/directories/${id}/deactivate`,
        method: 'POST',
      }),
      invalidatesTags: ['Directories'],
    }),

    getDirectoryUsers: builder.query<{ success: boolean; data: DirectoryUser[] }, number>({
      query: (id) => `/directories/${id}/users`,
      transformResponse: (response: any) => {
        const rawList = Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response?.users)
          ? response.users
          : [];
        return {
          success: response?.success ?? true,
          data: rawList,
        };
      },
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
