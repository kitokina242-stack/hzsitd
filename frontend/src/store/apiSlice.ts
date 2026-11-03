import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from './index';

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1',
    prepareHeaders: (headers, { getState }) => {
      const state = getState() as RootState;
      const token = state.auth?.token || (typeof window !== 'undefined' ? localStorage.getItem('hzsitd_token') : null);
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      
      const dirId = state.auth?.activeDirectoryId || state.auth?.user?.directory_id;
      if (dirId) {
        headers.set('x-directory-id', String(dirId));
      }
      
      return headers;
    },
  }),
  tagTypes: ['Letters', 'Letter', 'Stats', 'Users', 'Directories', 'Audit', 'Conversations', 'Messages', 'Notifications'],
  endpoints: () => ({}),
});
