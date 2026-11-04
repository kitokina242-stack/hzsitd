'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Send, MessageSquare, Plus, Users, User, Shield, Paperclip, CheckCheck, Clock, Search } from 'lucide-react';
import { useAppSelector } from '@/store';
import {
  useGetConversationsQuery,
  useCreateConversationMutation,
  useGetMessagesQuery,
  useSendMessageMutation,
  Conversation,
  ChatMessage
} from '@/modules/messagemodule/services/messageApi';
import { useSocket } from '@/modules/messagemodule/hooks/useSocket';

interface MessagingDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialLetterId?: number;
  initialLetterSubject?: string;
}

// Initial mock conversations for offline/demo resilience
const MOCK_CONVERSATIONS: Conversation[] = [
  {
    conversation_id: 1,
    conversation_type: 'group',
    conversation_name: 'Executive Leadership Channel',
    created_by: 1,
    created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
    is_active: true,
    last_message: 'Dr. Bezabih: Budget review has been approved and sealed.',
    unread_count: 0
  },
  {
    conversation_id: 2,
    conversation_type: 'direct',
    conversation_name: 'Software Directorate Internal',
    created_by: 2,
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    is_active: true,
    last_message: 'Eng. Yohannes: Fiber optic procurement specifications reviewed.',
    unread_count: 1
  },
  {
    conversation_id: 3,
    conversation_type: 'group',
    conversation_name: 'Zonal Digital Taskforce',
    created_by: 4,
    created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
    is_active: true,
    last_message: 'Almaz Tesfaye: Draft minutes uploaded for verification.',
    unread_count: 0
  }
];

const MOCK_MESSAGES_MAP: Record<number, ChatMessage[]> = {
  1: [
    {
      message_id: 101,
      conversation_id: 1,
      sender_id: 1,
      sender_name: 'Dr. Bezabih Alemu',
      sender_role: 'Department Head',
      message_text: 'Colleagues, please ensure all Q1 procurement letters are dispatched before Friday.',
      sent_at: '10:14 AM'
    },
    {
      message_id: 102,
      conversation_id: 1,
      sender_id: 2,
      sender_name: 'Eng. Yohannes Haile',
      sender_role: 'Directory Lead',
      message_text: 'Understood Dr. Bezabih. Software Directorate has prepared 4 letters for executive signature.',
      sent_at: '10:18 AM'
    },
    {
      message_id: 103,
      conversation_id: 1,
      sender_id: 1,
      sender_name: 'Dr. Bezabih Alemu',
      sender_role: 'Department Head',
      message_text: 'Budget review has been approved and sealed.',
      sent_at: '10:25 AM'
    }
  ],
  2: [
    {
      message_id: 201,
      conversation_id: 2,
      sender_id: 2,
      sender_name: 'Eng. Yohannes Haile',
      sender_role: 'Directory Lead',
      message_text: 'Almaz, please verify the technical annex on the server cluster proposal.',
      sent_at: 'Yesterday'
    },
    {
      message_id: 202,
      conversation_id: 2,
      sender_id: 4,
      sender_name: 'Almaz Tesfaye',
      sender_role: 'Officer',
      message_text: 'Verified and attached to letter LTR-2026-0042.',
      sent_at: 'Yesterday'
    }
  ],
  3: [
    {
      message_id: 301,
      conversation_id: 3,
      sender_id: 8,
      sender_name: 'Solomon Bekele',
      sender_role: 'System Admin',
      message_text: 'Security patch applied to all directory workstations.',
      sent_at: '2 days ago'
    }
  ]
};

export const MessagingDrawer: React.FC<MessagingDrawerProps> = ({
  isOpen,
  onClose,
  initialLetterId,
  initialLetterSubject
}) => {
  const currentUser = useAppSelector((state) => state.auth.user);
  const { socket } = useSocket();

  const { data: convData } = useGetConversationsQuery(undefined, { skip: !isOpen });
  const [createConversationApi] = useCreateConversationMutation();
  const [sendMessageApi, { isLoading: isSending }] = useSendMessageMutation();

  const conversations: Conversation[] = convData?.data && convData.data.length > 0
    ? convData.data
    : MOCK_CONVERSATIONS;

  const [activeConvId, setActiveConvId] = useState<number>(1);
  const [inputText, setInputText] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newChatName, setNewChatName] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    data: remoteMessagesData,
    isError: isRemoteMessagesError,
    isSuccess: isRemoteMessagesSuccess
  } = useGetMessagesQuery(activeConvId, {
    skip: !isOpen || !activeConvId
  });

  // Load messages from remote (when API is reachable) or mock (when offline/error)
  useEffect(() => {
    if (isRemoteMessagesSuccess && remoteMessagesData?.data) {
      setLocalMessages(remoteMessagesData.data);
    } else if (isRemoteMessagesError) {
      if (MOCK_MESSAGES_MAP[activeConvId]) {
        setLocalMessages(MOCK_MESSAGES_MAP[activeConvId]);
      } else {
        setLocalMessages([]);
      }
    }
  }, [remoteMessagesData, isRemoteMessagesSuccess, isRemoteMessagesError, activeConvId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [localMessages]);

  // Listen to live socket messages
  useEffect(() => {
    if (!socket) return;

    const handleIncomingMessage = (msg: ChatMessage) => {
      if (msg.conversation_id === activeConvId) {
        setLocalMessages((prev) => [...prev, msg]);
      }
    };

    socket.on('message:received', handleIncomingMessage);
    return () => {
      socket.off('message:received', handleIncomingMessage);
    };
  }, [socket, activeConvId]);

  if (!isOpen) return null;

  const activeConv = conversations.find((c) => c.conversation_id === activeConvId) || conversations[0];

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const text = inputText.trim();
    setInputText('');

    const newMsg: ChatMessage = {
      message_id: Date.now(),
      conversation_id: activeConvId,
      sender_id: currentUser?.id || 1,
      sender_name: currentUser?.full_name || 'Current Officer',
      sender_role: currentUser?.role || 'Officer',
      message_text: text,
      sent_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setLocalMessages((prev) => [...prev, newMsg]);

    try {
      await sendMessageApi({
        conversation_id: activeConvId,
        message_text: text
      }).unwrap();
    } catch {
      // Local message is already appended for offline resilience
    }
  };

  const handleCreateConversation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChatName.trim()) return;

    try {
      const res = await createConversationApi({
        conversation_type: 'group',
        conversation_name: newChatName.trim(),
        letter_id: initialLetterId
      }).unwrap();

      if (res.data) {
        setActiveConvId(res.data.conversation_id);
      }
    } catch {
      const mockId = Date.now();
      MOCK_CONVERSATIONS.unshift({
        conversation_id: mockId,
        conversation_type: 'group',
        conversation_name: newChatName.trim(),
        created_by: currentUser?.id || 1,
        created_at: new Date().toISOString(),
        is_active: true,
        last_message: 'Conversation started.'
      });
      MOCK_MESSAGES_MAP[mockId] = [];
      setActiveConvId(mockId);
    }

    setNewChatName('');
    setIsCreatingNew(false);
  };

  const filteredConversations = conversations.filter((c) =>
    c.conversation_name.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-sm animate-fade-in font-sans">
      <div className="bg-slate-900 border-l border-slate-800 shadow-2xl w-full max-w-2xl h-full flex flex-col overflow-hidden animate-slide-left">
        {/* Drawer Header */}
        <div className="h-16 px-6 border-b border-slate-800 flex items-center justify-between bg-slate-850 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Internal Directives & Messaging</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </h3>
              <p className="text-xs text-slate-400">Secure zonal correspondence chat</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Main Grid: Sidebar (Conversations) + Chat View */}
        <div className="flex-1 flex overflow-hidden">
          {/* Conversation List Column */}
          <div className="w-64 border-r border-slate-800 bg-slate-900/80 flex flex-col shrink-0">
            {/* Search & New Chat Button */}
            <div className="p-3 border-b border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Channels</span>
                <button
                  type="button"
                  onClick={() => setIsCreatingNew(!isCreatingNew)}
                  className="p-1 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-md transition-colors"
                  title="Create New Channel"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {isCreatingNew && (
                <form onSubmit={handleCreateConversation} className="p-2 bg-slate-800/80 rounded-xl border border-slate-700/60 space-y-2">
                  <input
                    type="text"
                    value={newChatName}
                    onChange={(e) => setNewChatName(e.target.value)}
                    placeholder="Channel / Group Name"
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    autoFocus
                  />
                  <div className="flex justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => setIsCreatingNew(false)}
                      className="px-2 py-1 text-[11px] text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-2.5 py-1 text-[11px] font-semibold text-white bg-emerald-600 rounded-md hover:bg-emerald-500"
                    >
                      Create
                    </button>
                  </div>
                </form>
              )}

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Filter channels..."
                  className="w-full pl-8 pr-2.5 py-1.5 bg-slate-800/60 border border-slate-700/60 rounded-lg text-slate-200 text-xs placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Conversations Scroll */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {filteredConversations.map((conv) => {
                const isActive = conv.conversation_id === activeConvId;
                return (
                  <button
                    key={conv.conversation_id}
                    onClick={() => setActiveConvId(conv.conversation_id)}
                    className={`w-full text-left p-2.5 rounded-xl transition-all flex items-start gap-2.5 ${
                      isActive
                        ? 'bg-emerald-500/15 border border-emerald-500/30 text-white'
                        : 'hover:bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-transparent'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        isActive
                          ? 'bg-emerald-500 text-slate-950 font-bold'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {conv.conversation_type === 'group' ? (
                        <Users className="w-4 h-4" />
                      ) : (
                        <User className="w-4 h-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold truncate text-slate-200">
                          {conv.conversation_name || (conv.conversation_type === 'group' ? 'Executive Leadership Channel' : 'Direct Zonal Channel')}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {conv.last_message || 'No messages yet'}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Chat Column */}
          <div className="flex-1 flex flex-col bg-slate-950/40">
            {/* Active Header */}
            <div className="px-5 py-3 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>{activeConv?.conversation_name || (activeConv?.conversation_type === 'group' ? 'Executive Communication Hub' : 'Direct Official Chat')}</span>
                </h4>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Official Communication Channel &bull; Encrypted &bull; Live Gateway
                </p>
              </div>
            </div>

            {/* Message Stream */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
              {localMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs text-center p-6">
                  <MessageSquare className="w-8 h-8 mb-2 text-slate-600" />
                  <p>No messages in this channel yet.</p>
                  <p className="text-[11px] text-slate-600 mt-1">Send a directive or note to start the conversation.</p>
                </div>
              ) : (
                localMessages.map((msg) => {
                  const isMe = msg.sender_id === (currentUser?.id || 1);
                  return (
                    <div
                      key={msg.message_id}
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 px-1">
                        <span className="text-[11px] font-semibold text-slate-300">
                          {isMe
                            ? 'You'
                            : msg.sender
                            ? `${msg.sender.first_name} ${msg.sender.last_name}`
                            : msg.sender_name || `Officer #${msg.sender_id}`}
                        </span>
                        {msg.sender_role && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                            {msg.sender_role}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-500">{msg.sent_at}</span>
                      </div>

                      <div
                        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                          isMe
                            ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-tr-xs shadow-md shadow-emerald-700/20'
                            : 'bg-slate-800 border border-slate-700 text-slate-200 rounded-tl-xs'
                        }`}
                      >
                        {msg.message_text}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input Bar */}
            <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-800 bg-slate-900/80 flex items-center gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={`Message ${activeConv?.conversation_name || 'channel'}...`}
                className="flex-1 px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="submit"
                disabled={!inputText.trim() || isSending}
                className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50 transition-colors shadow-sm cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
export default MessagingDrawer;
