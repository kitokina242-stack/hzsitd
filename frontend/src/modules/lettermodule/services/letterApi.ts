import { apiSlice } from '@/store/apiSlice';
import { Letter, LetterTimeline, LetterComment, DashboardStats, LetterAttachment } from '@/types/letter';

export interface GetLettersParams {
  tab?: 'all' | 'inbox' | 'sent' | 'drafts' | 'archived';
  status?: string;
  priority?: string;
  direction?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface LetterDetailResponse {
  success: boolean;
  letter: Letter;
  data?: any;
  timeline: LetterTimeline[];
  comments: LetterComment[];
  attachments: LetterAttachment[];
}

export type WorkflowAction =
  | 'submit_to_lead'
  | 'approve_to_head'
  | 'return_for_revision'
  | 'endorse_and_seal'
  | 'endorse_and_sign'
  | 'assign_to_directory'
  | 'delegate_to_officer'
  | 'archive'
  | 'receive'
  | 'close';

export interface ExecuteActionPayload {
  id: number;
  action: WorkflowAction;
  notes?: string;
  recipient_directory_id?: number;
  assigned_officer_id?: number;
  signature_type?: 'PROFILE' | 'DRAWN' | 'UPLOADED';
  custom_signature?: string;
}

export const letterApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getStats: builder.query<{ success: boolean; stats: DashboardStats }, void>({
      query: () => '/letters/stats',
      providesTags: ['Stats'],
    }),

    getLetters: builder.query<{ success: boolean; count: number; letters: Letter[]; data?: Letter[] }, GetLettersParams | void>({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params?.tab) queryParams.set('tab', params.tab);
        if (params?.status) queryParams.set('status', params.status);
        if (params?.priority) queryParams.set('priority', params.priority);
        if (params?.direction) queryParams.set('direction', params.direction);
        if (params?.search) queryParams.set('search', params.search);
        if (params?.page) queryParams.set('page', String(params.page));
        if (params?.limit) queryParams.set('limit', String(params.limit));
        return `/letters?${queryParams.toString()}`;
      },
      transformResponse: (response: any) => {
        const raw = Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response?.letters)
          ? response.letters
          : Array.isArray(response)
          ? response
          : [];
        return {
          success: response?.success ?? true,
          count: response?.meta?.total ?? response?.count ?? raw.length,
          letters: raw,
          data: raw,
        };
      },
      providesTags: ['Letters'],
    }),

    getInboxLetters: builder.query<{ success: boolean; data: Letter[] }, { page?: number; limit?: number } | void>({
      query: (params) => {
        const q = new URLSearchParams();
        if (params?.page) q.set('page', String(params.page));
        if (params?.limit) q.set('limit', String(params.limit));
        return `/letters/inbox?${q.toString()}`;
      },
      providesTags: ['Letters'],
    }),

    getOutboxLetters: builder.query<{ success: boolean; data: Letter[] }, { page?: number; limit?: number } | void>({
      query: (params) => {
        const q = new URLSearchParams();
        if (params?.page) q.set('page', String(params.page));
        if (params?.limit) q.set('limit', String(params.limit));
        return `/letters/outbox?${q.toString()}`;
      },
      providesTags: ['Letters'],
    }),

    getLetterById: builder.query<LetterDetailResponse, number>({
      query: (id) => `/letters/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Letter', id }],
    }),

    getLetterTimeline: builder.query<{ success: boolean; data: any[] }, number>({
      query: (id) => `/letters/${id}/timeline`,
      providesTags: (_result, _error, id) => [{ type: 'Letter', id }],
    }),

    trackLetter: builder.query<{ success: boolean; data: any }, string>({
      query: (trackingNumber) => `/letters/track/${trackingNumber}`,
    }),

    createLetter: builder.mutation<
      { success: boolean; letter_id?: number; tracking_number?: string; reference_no?: string; data?: any },
      FormData | (Omit<Partial<Letter>, 'attachments'> & {
        is_draft?: boolean;
        source_type?: string;
        letter_type?: string;
        letter_condition?: string;
        owning_directory_id?: number;
        received_directory_id?: number;
        received_by?: number;
        signature_id?: number;
        stamp_id?: number | null;
        letter_date?: string;
        response_due_at?: string;
        attachments?: Array<{
          filename: string;
          original_name: string;
          mime_type: string;
          file_size: number;
          url?: string;
          file_path?: string;
        }>;
      })
    >({
      query: (body) => ({
        url: '/letters',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Letters', 'Stats'],
    }),

    receiveLetter: builder.mutation<{ success: boolean; message: string; data?: any }, number>({
      query: (letterId) => ({
        url: `/letters/${letterId}/receive`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, id) => ['Letters', 'Stats', { type: 'Letter', id }],
    }),

    archiveLetter: builder.mutation<{ success: boolean; message: string; data?: any }, number>({
      query: (letterId) => ({
        url: `/letters/${letterId}/archive`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, id) => ['Letters', 'Stats', { type: 'Letter', id }],
    }),

    closeLetter: builder.mutation<{ success: boolean; message: string; data?: any }, number>({
      query: (letterId) => ({
        url: `/letters/${letterId}/close`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, id) => ['Letters', 'Stats', { type: 'Letter', id }],
    }),

    uploadFile: builder.mutation<
      { success: boolean; file: { filename: string; original_name: string; mime_type: string; file_size: number; url: string } },
      FormData
    >({
      query: (formData) => ({
        url: '/upload',
        method: 'POST',
        body: formData,
      }),
    }),

    attachFilesToLetter: builder.mutation<
      { success: boolean; message: string; attachments: LetterAttachment[] },
      { id: number; formData: FormData }
    >({
      query: ({ id, formData }) => ({
        url: `/letters/${id}/attachments`,
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Letter', id }, 'Audit'],
    }),

    executeLetterAction: builder.mutation<{ success: boolean; message: string }, ExecuteActionPayload>({
      query: (body) => ({
        url: `/letters/${body.id}/action`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        'Letters',
        'Stats',
        'Audit',
        { type: 'Letter', id },
      ],
    }),

    addLetterComment: builder.mutation<{ success: boolean; message: string }, { id: number; comment_text: string; comment_type?: string }>({
      query: ({ id, ...body }) => ({
        url: `/letters/${id}/comments`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Letter', id }],
    }),
  }),
});

export const {
  useGetStatsQuery,
  useGetLettersQuery,
  useGetInboxLettersQuery,
  useGetOutboxLettersQuery,
  useGetLetterByIdQuery,
  useGetLetterTimelineQuery,
  useTrackLetterQuery,
  useCreateLetterMutation,
  useReceiveLetterMutation,
  useArchiveLetterMutation,
  useCloseLetterMutation,
  useUploadFileMutation,
  useAttachFilesToLetterMutation,
  useExecuteLetterActionMutation,
  useAddLetterCommentMutation,
} = letterApi;
