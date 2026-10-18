import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from './index';

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api',
    prepareHeaders: (headers, { getState }) => {
      // Automatic token injection from Redux Auth state or localStorage
      const state = getState() as RootState;
      const token = state.auth?.token || (typeof window !== 'undefined' ? localStorage.getItem('hzsitd_token') : null);
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['Letters', 'Letter', 'Stats', 'Users', 'Directories', 'Audit', 'Chat'],
  endpoints: () => ({}),
});
