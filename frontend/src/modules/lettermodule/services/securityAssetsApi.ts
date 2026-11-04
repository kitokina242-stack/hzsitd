import { apiSlice } from '@/store/apiSlice';

export interface Stamp {
  stamp_id: number;
  stamp_name: string;
  stamp_image_url?: string;
  directory_id: number;
  directory_name?: string;
  uploaded_by?: number;
  is_active: boolean;
  created_at?: string;
}

export interface Signature {
  signature_id: number;
  signed_by: number;
  signer_name?: string;
  signature_type: 'handwritten_image' | 'digital_certificate';
  signature_reference: string;
  signature_image_url?: string;
  signed_at?: string;
  is_active: boolean;
}

export interface LetterTemplate {
  template_id: number;
  template_name: string;
  description: string;
  template_storage_key?: string;
  created_by?: number;
  directory_id?: number;
  directory_name?: string;
  is_active: boolean;
  created_at?: string;
}

export interface Role {
  role_id: number;
  role_name: string;
  description: string;
  permissions?: Permission[];
}

export interface Permission {
  permission_id: number;
  permission_code: string;
  permission_name: string;
  description?: string;
}

export const securityAssetsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Stamps
    getStamps: builder.query<{ success: boolean; data: Stamp[] }, void>({
      query: () => '/stamps',
      providesTags: ['Stamps'],
    }),
    createStamp: builder.mutation<
      { success: boolean; data: Stamp },
      { stamp_name: string; stamp_image_url?: string; directory_id: number; is_active?: boolean }
    >({
      query: (body) => ({
        url: '/stamps',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Stamps'],
    }),

    // Signatures
    getSignatures: builder.query<{ success: boolean; data: Signature[] }, void>({
      query: () => '/signatures',
      providesTags: ['Signatures'],
    }),
    createSignature: builder.mutation<
      { success: boolean; data: Signature },
      { signature_type: string; signature_reference: string; signature_image_url?: string }
    >({
      query: (body) => ({
        url: '/signatures',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Signatures'],
    }),

    // Templates
    getTemplates: builder.query<{ success: boolean; data: LetterTemplate[] }, void>({
      query: () => '/templates',
      providesTags: ['Templates'],
    }),
    createTemplate: builder.mutation<
      { success: boolean; data: LetterTemplate },
      { template_name: string; description: string; directory_id?: number; is_active?: boolean }
    >({
      query: (body) => ({
        url: '/templates',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Templates'],
    }),

    // Roles & Permissions
    getRoles: builder.query<{ success: boolean; data: Role[] }, void>({
      query: () => '/roles',
      providesTags: ['Roles'],
    }),
    getPermissions: builder.query<{ success: boolean; data: Permission[] }, void>({
      query: () => '/permissions',
      providesTags: ['Permissions'],
    }),
    assignRolePermission: builder.mutation<
      { success: boolean; message: string },
      { role_id: number; permission_id: number }
    >({
      query: ({ role_id, permission_id }) => ({
        url: `/roles/${role_id}/permissions`,
        method: 'POST',
        body: { permission_id },
      }),
      invalidatesTags: ['Roles', 'Permissions'],
    }),
  }),
});

export const {
  useGetStampsQuery,
  useCreateStampMutation,
  useGetSignaturesQuery,
  useCreateSignatureMutation,
  useGetTemplatesQuery,
  useCreateTemplateMutation,
  useGetRolesQuery,
  useGetPermissionsQuery,
  useAssignRolePermissionMutation,
} = securityAssetsApi;
