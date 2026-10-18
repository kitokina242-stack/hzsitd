import { apiSlice } from '@/store/apiSlice';
import { Letter, LetterTimeline, LetterComment, DashboardStats, LetterAttachment } from '@/types/letter';

export interface GetLettersParams {
  tab?: 'all' | 'inbox' | 'sent' | 'drafts' | 'archived';
  status?: string;
  priority?: string;
  direction?: string;
  search?: string;
}

export interface LetterDetailResponse {
  success: boolean;
  letter: Letter;
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
  | 'archive';

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
      query: () => '/stats',
      providesTags: ['Stats'],
    }),
    getLetters: builder.query<{ success: boolean; count: number; letters: Letter[] }, GetLettersParams | void>({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params?.tab) queryParams.set('tab', params.tab);
        if (params?.status) queryParams.set('status', params.status);
        if (params?.priority) queryParams.set('priority', params.priority);
        if (params?.direction) queryParams.set('direction', params.direction);
        if (params?.search) queryParams.set('search', params.search);
        return `/letters?${queryParams.toString()}`;
      },
      providesTags: ['Letters'],
    }),
    getLetterById: builder.query<LetterDetailResponse, number>({
      query: (id) => `/letters/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Letter', id }],
    }),
    createLetter: builder.mutation<
      { success: boolean; letter_id: number; reference_no: string },
      Omit<Partial<Letter>, 'attachments'> & {
        is_draft?: boolean;
        attachments?: Array<{
          filename: string;
          original_name: string;
          mime_type: string;
          file_size: number;
          url?: string;
          file_path?: string;
        }>;
      }
    >({
      query: (body) => ({
        url: '/letters',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Letters', 'Stats'],
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
  useGetLetterByIdQuery,
  useCreateLetterMutation,
  useUploadFileMutation,
  useAttachFilesToLetterMutation,
  useExecuteLetterActionMutation,
  useAddLetterCommentMutation,
} = letterApi;
