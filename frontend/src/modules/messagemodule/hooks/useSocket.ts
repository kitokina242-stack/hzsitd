'use client';

import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAppDispatch, useAppSelector } from '@/store';
import { apiSlice } from '@/store/apiSlice';
import { setSocketConnected, addNotification } from '../features/messageSlice';

const SOCKET_SERVER_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:8000';

export function useSocket() {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector((state) => state.auth.user);
  const isConnected = useAppSelector((state) => state.message.isConnected);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Initialize socket connection
    const socket: Socket = io(SOCKET_SERVER_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      dispatch(setSocketConnected(true));

      // Join user and role specific rooms if available
      if (currentUser?.id) {
        socket.emit('join:user', {
          userId: currentUser.id,
          role: currentUser.role,
          directoryId: currentUser.directory_id,
        });
      }
    });

    socket.on('disconnect', () => {
      dispatch(setSocketConnected(false));
    });

    // Workflow Event Listeners
    socket.on('letter:created', (data: { reference_no: string; subject: string; sender: string }) => {
      dispatch(
        addNotification({
          title: 'New Letter Received',
          message: `${data.reference_no} - "${data.subject}" submitted by ${data.sender}.`,
          type: 'info',
          referenceNo: data.reference_no,
        })
      );
      // Invalidate RTK Query cache to trigger auto-refetch
      dispatch(apiSlice.util.invalidateTags(['Letters', 'Stats']));
    });

    socket.on('letter:action', (data: { reference_no: string; action: string; actor: string }) => {
      dispatch(
        addNotification({
          title: 'Letter Stage Updated',
          message: `${data.reference_no} was updated: ${data.action} by ${data.actor}.`,
          type: data.action.includes('Endorsed') ? 'success' : 'info',
          referenceNo: data.reference_no,
        })
      );
      dispatch(apiSlice.util.invalidateTags(['Letters', 'Stats']));
    });

    socket.on('letter:comment', (data: { reference_no: string; author: string; text: string }) => {
      dispatch(
        addNotification({
          title: 'New Minute / Directive Added',
          message: `${data.author} commented on ${data.reference_no}: "${data.text}".`,
          type: 'warning',
          referenceNo: data.reference_no,
        })
      );
      dispatch(apiSlice.util.invalidateTags(['Letters']));
    });

    return () => {
      socket.disconnect();
    };
  }, [dispatch, currentUser?.id, currentUser?.role, currentUser?.directory_id]);

  const emitEvent = (eventName: string, payload: unknown) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(eventName, payload);
    }
  };

  return {
    isConnected,
    socket: socketRef.current,
    emitEvent,
  };
}
