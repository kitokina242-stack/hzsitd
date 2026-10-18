'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useAppDispatch, useAppSelector } from '@/store';
import { markAllAsRead, clearNotifications } from '../features/messageSlice';
import { Bell, CheckCheck, Trash2, Wifi, WifiOff } from 'lucide-react';

export const NotificationDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const dispatch = useAppDispatch();

  const isConnected = useAppSelector((state) => state.message.isConnected);
  const notifications = useAppSelector((state) => state.message.notifications);
  const unreadCount = useAppSelector((state) => state.message.unreadCount);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition focus:outline-none"
        title="Live System Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white animate-pulse" />
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs text-slate-900">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500">
              {isConnected ? (
                <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                  <Wifi className="w-3 h-3" /> Live
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-amber-600 font-semibold">
                  <WifiOff className="w-3 h-3" /> Standby
                </span>
              )}
            </div>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No recent notifications
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  className={`p-3.5 flex gap-3 text-xs transition ${
                    item.read ? 'bg-white opacity-70' : 'bg-emerald-50/20'
                  }`}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    <Image
                      src={
                        item.type === 'success'
                          ? '/animated-icons/wired-outline-37-check-in-reveal.webp'
                          : item.type === 'warning'
                          ? '/animated-icons/wired-outline-35-pencil-in-reveal.webp'
                          : '/animated-icons/wired-outline-3090-mail-open-document-in-reveal.webp'
                      }
                      alt="Icon"
                      width={18}
                      height={18}
                      unoptimized
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-[11px]">{item.title}</span>
                      <span className="text-[10px] text-slate-400">{item.timestamp}</span>
                    </div>
                    <p className="text-slate-600 text-[11px] leading-relaxed">{item.message}</p>
                    {item.referenceNo && (
                      <span className="inline-block mt-1 font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        {item.referenceNo}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Actions */}
          {notifications.length > 0 && (
            <div className="p-2.5 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => dispatch(markAllAsRead())}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-200/60 font-medium transition"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark read</span>
              </button>
              <button
                type="button"
                onClick={() => dispatch(clearNotifications())}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 font-medium transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
