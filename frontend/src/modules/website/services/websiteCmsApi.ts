import { apiSlice } from '@/store/apiSlice';

export interface Announcement {
  announcement_id: number;
  title: string;
  content: string;
  created_by?: number;
  published_at?: string | null;
  expires_at?: string | null;
  status: 'draft' | 'published' | 'archived';
  created_at: string;
}

export interface FaqItem {
  faq_id: number;
  question: string;
  answer: string;
  category: string;
  created_by?: number;
  is_published: boolean;
  created_at: string;
  updated_at?: string;
}

export interface ContactInquiry {
  inquiry_id: number;
  sender_name: string;
  sender_email: string;
  subject: string;
  message: string;
  inquiry_status: 'new' | 'assigned' | 'resolved';
  assigned_to?: number | null;
  submitted_at: string;
  resolved_at?: string | null;
}

export const websiteCmsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getAnnouncements: builder.query<{ success: boolean; data: Announcement[] }, void>({
      query: () => '/announcements',
      providesTags: ['Audit'],
    }),

    createAnnouncement: builder.mutation<{ success: boolean; data: Announcement }, { title: string; content: string }>({
      query: (body) => ({
        url: '/announcements',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Audit'],
    }),

    publishAnnouncement: builder.mutation<{ success: boolean; message: string }, number>({
      query: (id) => ({
        url: `/announcements/${id}/publish`,
        method: 'POST',
      }),
      invalidatesTags: ['Audit'],
    }),

    archiveAnnouncement: builder.mutation<{ success: boolean; message: string }, number>({
      query: (id) => ({
        url: `/announcements/${id}/archive`,
        method: 'POST',
      }),
      invalidatesTags: ['Audit'],
    }),

    getFaqs: builder.query<{ success: boolean; data: FaqItem[] }, void>({
      query: () => '/faqs',
    }),

    createFaq: builder.mutation<{ success: boolean; data: FaqItem }, { question: string; answer: string; category?: string }>({
      query: (body) => ({
        url: '/faqs',
        method: 'POST',
        body,
      }),
    }),

    deleteFaq: builder.mutation<{ success: boolean; message: string }, number>({
      query: (id) => ({
        url: `/faqs/${id}`,
        method: 'DELETE',
      }),
    }),

    getContactInquiries: builder.query<{ success: boolean; data: ContactInquiry[] }, void>({
      query: () => '/contact-inquiries',
    }),

    resolveContactInquiry: builder.mutation<{ success: boolean; message: string }, number>({
      query: (id) => ({
        url: `/contact-inquiries/${id}/resolve`,
        method: 'PATCH',
      }),
    }),
  }),
});

export const {
  useGetAnnouncementsQuery,
  useCreateAnnouncementMutation,
  usePublishAnnouncementMutation,
  useArchiveAnnouncementMutation,
  useGetFaqsQuery,
  useCreateFaqMutation,
  useDeleteFaqMutation,
  useGetContactInquiriesQuery,
  useResolveContactInquiryMutation,
} = websiteCmsApi;
