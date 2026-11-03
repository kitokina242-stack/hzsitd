import { apiSlice } from '@/store/apiSlice';

export interface AuditLogItem {
  audit_log_id: number;
  user_id: number;
  user_name?: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details?: string;
  ip_address?: string;
  created_at: string;
}

export const auditApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getAuditLogs: builder.query<
      { success: boolean; data: AuditLogItem[]; meta?: { page: number; total: number; total_pages: number } },
      { page?: number; limit?: number; entity_type?: string; action?: string; q?: string } | void
    >({
      query: (params) => {
        const q = new URLSearchParams();
        if (params?.page) q.set('page', String(params.page));
        if (params?.limit) q.set('limit', String(params.limit));
        if (params?.entity_type) q.set('entity_type', params.entity_type);
        if (params?.action) q.set('action', params.action);
        if (params?.q) q.set('q', params.q);
        return `/audit-logs?${q.toString()}`;
      },
      providesTags: ['Audit'],
    }),
    getAuditLogById: builder.query<{ success: boolean; data: AuditLogItem }, number>({
      query: (id) => `/audit-logs/${id}`,
      providesTags: (_res, _err, id) => [{ type: 'Audit', id }],
    }),
  }),
});

export const { useGetAuditLogsQuery, useGetAuditLogByIdQuery } = auditApi;
