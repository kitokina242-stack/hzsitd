import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'info' | 'success' | 'warning' | 'urgent';
  letterId?: number;
  referenceNo?: string;
}

interface MessageState {
  isConnected: boolean;
  notifications: AppNotification[];
  unreadCount: number;
}

const initialState: MessageState = {
  isConnected: false,
  notifications: [
    {
      id: 'notif-1',
      title: 'Portal Initialized',
      message: 'Real-time WebSocket connection engine ready for correspondence directives.',
      timestamp: 'Just now',
      read: false,
      type: 'info',
    },
  ],
  unreadCount: 1,
};

export const messageSlice = createSlice({
  name: 'message',
  initialState,
  reducers: {
    setSocketConnected: (state, action: PayloadAction<boolean>) => {
      state.isConnected = action.payload;
    },
    addNotification: (state, action: PayloadAction<Omit<AppNotification, 'id' | 'read' | 'timestamp'>>) => {
      const newNotif: AppNotification = {
        id: `notif-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        read: false,
        ...action.payload,
      };
      state.notifications.unshift(newNotif);
      state.unreadCount += 1;
    },
    markAllAsRead: (state) => {
      state.notifications.forEach((n) => {
        n.read = true;
      });
      state.unreadCount = 0;
    },
    clearNotifications: (state) => {
      state.notifications = [];
      state.unreadCount = 0;
    },
  },
});

export const { setSocketConnected, addNotification, markAllAsRead, clearNotifications } =
  messageSlice.actions;

export default messageSlice.reducer;
