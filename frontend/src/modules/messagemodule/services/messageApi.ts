import { apiSlice } from '@/store/apiSlice';

export interface Conversation {
  conversation_id: number;
  conversation_type: 'direct' | 'group';
  letter_id?: number | null;
  conversation_name: string;
  created_by: number;
  created_at: string;
  is_active: boolean;
  last_message?: string;
  unread_count?: number;
}

export interface ChatMessage {
  message_id: number;
  conversation_id: number;
  sender_id: number;
  sender_name?: string;
  sender_role?: string;
  message_text: string;
  sent_at: string;
  edited_at?: string | null;
  deleted_at?: string | null;
  attachments?: Array<{
    attachment_id: number;
    filename: string;
    file_size_bytes: number;
    url: string;
  }>;
}

export const messageApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getConversations: builder.query<{ success: boolean; data: Conversation[] }, void>({
      query: () => '/conversations',
      providesTags: ['Conversations'],
    }),

    createConversation: builder.mutation<
      { success: boolean; data: Conversation },
      { conversation_type: 'direct' | 'group'; conversation_name: string; letter_id?: number }
    >({
      query: (body) => ({
        url: '/conversations',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Conversations'],
    }),

    getMessages: builder.query<{ success: boolean; data: ChatMessage[] }, number>({
      query: (conversationId) => `/conversations/${conversationId}/messages`,
      providesTags: (result, error, conversationId) => [
        { type: 'Messages', id: conversationId },
      ],
    }),

    sendMessage: builder.mutation<
      { success: boolean; data: ChatMessage },
      { conversation_id: number; message_text: string }
    >({
      query: ({ conversation_id, message_text }) => ({
        url: `/conversations/${conversation_id}/messages`,
        method: 'POST',
        body: { message_text },
      }),
      invalidatesTags: (result, error, { conversation_id }) => [
        { type: 'Messages', id: conversation_id },
        'Conversations',
      ],
    }),

    editMessage: builder.mutation<
      { success: boolean; data: ChatMessage },
      { message_id: number; conversation_id: number; message_text: string }
    >({
      query: ({ message_id, message_text }) => ({
        url: `/messages/${message_id}`,
        method: 'PATCH',
        body: { message_text },
      }),
      invalidatesTags: (result, error, { conversation_id }) => [
        { type: 'Messages', id: conversation_id },
      ],
    }),

    deleteMessage: builder.mutation<
      { success: boolean; message: string },
      { message_id: number; conversation_id: number }
    >({
      query: ({ message_id }) => ({
        url: `/messages/${message_id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { conversation_id }) => [
        { type: 'Messages', id: conversation_id },
      ],
    }),
  }),
});

export const {
  useGetConversationsQuery,
  useCreateConversationMutation,
  useGetMessagesQuery,
  useSendMessageMutation,
  useEditMessageMutation,
  useDeleteMessageMutation,
} = messageApi;
