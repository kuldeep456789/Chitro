'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Send, Loader2, MessageSquare, Phone, Video, Info, Smile,
  Check, CheckCheck,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useMessages } from '@/hooks/useMessages';
import { useSocket } from '@/hooks/useSocket';
import { GroupInfoModal } from '@/components/chat/group-info-modal';
import { CallModal } from '@/components/chat/call-modal';

interface ConversationDetail {
  id: string;
  type: 'DIRECT' | 'GROUP';
  name?: string;
  description?: string;
  avatarUrl?: string;
  members: Array<{
    id: string;
    role: 'OWNER' | 'ADMIN' | 'MEMBER';
    lastReadAt?: string;
    lastReadMessageId?: string;
    user: { id: string; displayName: string; username: string; avatarUrl?: string };
  }>;
}

interface PresenceState {
  [userId: string]: boolean;
}

export default function ConversationPage() {
  const params = useParams();
  const conversationId = params?.id as string;
  const router = useRouter();
  const { user } = useAuth();
  const {
    onTyping,
    sendTyping,
    onPresence,
    markConversationRead,
    onConversationRead,
    onGroupUpdated,
    initiateCall,
    sendCallSignal,
    acceptCall,
    rejectCall,
    hangupCall,
    onCallIncoming,
    onCallSignal,
    onCallAccepted,
    onCallRejected,
    onCallEnded,
  } = useSocket();
  const { messages, loading, sendMessage } = useMessages(conversationId);

  const [conversation, setConversation] = useState<ConversationDetail | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [presence, setPresence] = useState<PresenceState>({});
  const [otherLastReadAt, setOtherLastReadAt] = useState<string | null>(null);

  // Group Info Modal State
  const [showGroupInfo, setShowGroupInfo] = useState(false);

  // Call Modal State
  const [callModal, setCallModal] = useState<{
    isOpen: boolean;
    callType: 'audio' | 'video';
    isIncoming: boolean;
    targetUser: { id: string; displayName: string; username: string; avatarUrl?: string } | null;
  }>({
    isOpen: false,
    callType: 'audio',
    isIncoming: false,
    targetUser: null,
  });

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const loadConversation = useCallback(async () => {
    if (!user) return;
    try {
      const data = await apiClient(`/conversations/${conversationId}`);
      setConversation(data);
      // Determine the other member's lastReadAt in direct chat
      if (data?.type === 'DIRECT') {
        const other = data.members.find((m: any) => m.user.id !== user.id);
        if (other?.lastReadAt) {
          setOtherLastReadAt(other.lastReadAt);
        }
      }
    } catch {
      router.push('/chats');
    }
  }, [conversationId, user, router]);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    loadConversation();
  }, [user, loadConversation]);

  // Mark conversation read on entry & when new messages arrive
  useEffect(() => {
    if (!conversationId || !user) return;
    markConversationRead(conversationId);
    apiClient(`/conversations/${conversationId}/read`, { method: 'PUT' }).catch(() => {});
  }, [conversationId, user, messages.length]);

  // Real-time read receipt listener
  useEffect(() => {
    const cleanup = onConversationRead((data) => {
      if (data.conversationId !== conversationId) return;
      if (data.userId !== user?.id) {
        setOtherLastReadAt(data.readAt);
      }
    });
    return cleanup;
  }, [conversationId, user]);

  // Real-time group updates listener
  useEffect(() => {
    const cleanup = onGroupUpdated((payload) => {
      loadConversation();
    });
    return cleanup;
  }, [loadConversation]);

  // Real-time incoming call listener
  useEffect(() => {
    const cleanup = onCallIncoming((data) => {
      if (data.conversationId === conversationId || !callModal.isOpen) {
        setCallModal({
          isOpen: true,
          callType: data.callType,
          isIncoming: true,
          targetUser: {
            id: data.callerId,
            displayName: data.callerUsername || 'Caller',
            username: data.callerUsername || 'caller',
          },
        });
      }
    });
    return cleanup;
  }, [conversationId, callModal.isOpen]);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Typing indicator listener
  useEffect(() => {
    const cleanup = onTyping((data) => {
      if (data.conversationId !== conversationId || data.userId === user?.id) return;
      if (data.isTyping) {
        setTypingUsers((prev) => (prev.includes(data.username) ? prev : [...prev, data.username]));
      } else {
        setTypingUsers((prev) => prev.filter((u) => u !== data.username));
      }
    });
    return cleanup;
  }, [conversationId, user]);

  // Online presence listener
  useEffect(() => {
    const cleanup = onPresence((data: { userId: string; isOnline: boolean }) => {
      setPresence((prev) => ({ ...prev, [data.userId]: data.isOnline }));
    });
    return cleanup;
  }, []);

  const getConversationTitle = () => {
    if (!conversation) return '...';
    if (conversation.name) return conversation.name;
    const other = conversation.members.find((m) => m.user.id !== user?.id);
    return other?.user.displayName || 'Chat';
  };

  const getOtherMember = useCallback(() => {
    if (!conversation || conversation.type !== 'DIRECT') return null;
    return conversation.members.find((m) => m.user.id !== user?.id)?.user || null;
  }, [conversation, user]);

  const isOtherOnline = () => {
    const other = getOtherMember();
    if (!other) return false;
    return presence[other.id] === true;
  };

  const getSubtitle = () => {
    if (typingUsers.length > 0) return null;
    if (conversation?.type === 'GROUP') {
      return `${conversation.members.length} members`;
    }
    return isOtherOnline() ? 'Online' : 'Offline';
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    sendTyping(conversationId, true);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => sendTyping(conversationId, false), 2000);
  };

  const handleSend = async () => {
    if (!text.trim() || sending || !user) return;
    const toSend = text.trim();
    setText('');
    setSending(true);
    sendTyping(conversationId, false);
    try {
      await sendMessage(toSend, user.id);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDateSeparator = (iso: string) => {
    const d = new Date(iso);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
  };

  // Launch audio or video call
  const startCall = (callType: 'audio' | 'video') => {
    const other = getOtherMember();
    if (!other) return;
    setCallModal({
      isOpen: true,
      callType,
      isIncoming: false,
      targetUser: other,
    });
  };

  // Build messages with date separators & dynamic read receipts
  const renderMessages = () => {
    const elements: React.ReactNode[] = [];
    let lastDate = '';

    messages.forEach((msg, i) => {
      const msgDate = new Date(msg.createdAt).toDateString();
      if (msgDate !== lastDate) {
        lastDate = msgDate;
        elements.push(
          <div key={`sep-${i}`} className="flex items-center space-x-2 my-3 px-4">
            <div className="flex-1 h-px bg-slate-100" />
            <span className="text-[11px] text-slate-400 font-medium px-2">
              {formatDateSeparator(msg.createdAt)}
            </span>
            <div className="flex-1 h-px bg-slate-100" />
          </div>
        );
      }

      const isOwn = msg.senderId === user?.id;
      const isOptimistic = msg.id.startsWith('optimistic_');
      // Read status: if other member read after msg.createdAt
      const isRead =
        !isOptimistic &&
        otherLastReadAt &&
        new Date(otherLastReadAt).getTime() >= new Date(msg.createdAt).getTime();

      elements.push(
        <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} px-4 mb-1`}>
          <div className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
            {/* Sender name in group chats */}
            {!isOwn && conversation?.type === 'GROUP' && (
              <span className="text-[11px] text-slate-400 font-medium mb-1 ml-1">
                {msg.sender.displayName}
              </span>
            )}

            {/* Bubble */}
            <div
              className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words ${
                isOwn
                  ? `bg-blue-600 text-white rounded-br-md ${isOptimistic ? 'opacity-60' : ''}`
                  : 'bg-slate-100 text-slate-900 rounded-bl-md'
              }`}
            >
              {msg.text}
            </div>

            {/* Timestamp + dynamic read receipt */}
            <div className="flex items-center space-x-1 mt-0.5 mx-1">
              <span className="text-[10px] text-slate-400">
                {isOptimistic ? '●' : formatTime(msg.createdAt)}
              </span>
              {isOwn && !isOptimistic && (
                <span className="text-[10px] flex items-center">
                  {isRead ? (
                    <CheckCheck className="w-3.5 h-3.5 text-blue-500 inline" title="Read" />
                  ) : (
                    <Check className="w-3.5 h-3.5 text-slate-400 inline" title="Delivered" />
                  )}
                </span>
              )}
            </div>
          </div>
        </div>
      );
    });

    return elements;
  };

  const title = getConversationTitle();
  const subtitle = getSubtitle();
  const otherOnline = isOtherOnline();

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-3 py-2.5 pt-12 flex items-center space-x-2 sticky top-0 z-10 shadow-xs">
        <Link
          href="/chats"
          className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-600 hover:bg-slate-100 transition shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>

        {/* Avatar with online dot */}
        <div className="relative shrink-0">
          <div
            className={`w-9 h-9 rounded-2xl flex items-center justify-center text-white font-bold text-sm ${
              conversation?.type === 'GROUP'
                ? 'bg-gradient-to-br from-purple-500 to-indigo-600'
                : 'bg-gradient-to-br from-blue-500 to-cyan-500'
            }`}
          >
            {title[0]?.toUpperCase()}
          </div>
          {conversation?.type === 'DIRECT' && (
            <div
              className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${
                otherOnline ? 'bg-emerald-400' : 'bg-slate-300'
              }`}
            />
          )}
        </div>

        {/* Title & subtitle */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900 text-sm truncate leading-tight">{title}</p>
          {typingUsers.length > 0 ? (
            <p className="text-xs text-blue-500 animate-pulse leading-tight">
              {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
            </p>
          ) : subtitle ? (
            <p className={`text-xs leading-tight ${otherOnline ? 'text-emerald-500 font-medium' : 'text-slate-400'}`}>
              {subtitle}
            </p>
          ) : null}
        </div>

        {/* Action buttons — audio & video calls for direct, info for group */}
        <div className="flex items-center space-x-1 shrink-0">
          {conversation?.type === 'DIRECT' && (
            <>
              <button
                type="button"
                className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition"
                title="Voice call"
                onClick={() => startCall('audio')}
              >
                <Phone className="w-4 h-4" />
              </button>
              <button
                type="button"
                className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition"
                title="Video call"
                onClick={() => startCall('video')}
              >
                <Video className="w-4 h-4" />
              </button>
            </>
          )}
          {conversation?.type === 'GROUP' && (
            <button
              type="button"
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-600 hover:bg-slate-100 transition"
              title="Group info"
              onClick={() => setShowGroupInfo(true)}
            >
              <Info className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-3 bg-slate-50/30">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
          </div>
        )}
        {!loading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full py-16 px-8 text-center">
            <div className="w-14 h-14 bg-blue-50 rounded-3xl flex items-center justify-center mb-3">
              <MessageSquare className="w-7 h-7 text-blue-400" />
            </div>
            <p className="text-slate-600 font-semibold text-sm">Say hello!</p>
            <p className="text-slate-400 text-xs mt-1">Send the first message</p>
          </div>
        )}
        {renderMessages()}
        <div ref={bottomRef} className="h-1" />
      </div>

      {/* Message Composer */}
      <div className="bg-white border-t border-slate-100 px-3 py-2.5 flex items-end space-x-2">
        <button className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 transition shrink-0 mb-1">
          <Smile className="w-5 h-5" />
        </button>
        <textarea
          ref={inputRef}
          rows={1}
          placeholder="Type a message..."
          value={text}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          className="flex-1 px-4 py-2.5 text-sm bg-slate-100 rounded-2xl resize-none max-h-28 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white focus:border focus:border-blue-200 transition placeholder:text-slate-400 leading-5"
          style={{ overflowY: text.split('\n').length > 4 ? 'scroll' : 'hidden' }}
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || sending}
          className="w-9 h-9 bg-blue-600 hover:bg-blue-700 rounded-2xl flex items-center justify-center shadow-md shadow-blue-600/25 disabled:opacity-40 transition shrink-0 mb-0.5"
        >
          {sending ? (
            <Loader2 className="w-4 h-4 text-white animate-spin" />
          ) : (
            <Send className="w-4 h-4 text-white" />
          )}
        </button>
      </div>

      {/* Group Info Modal */}
      {conversation && conversation.type === 'GROUP' && (
        <GroupInfoModal
          isOpen={showGroupInfo}
          onClose={() => setShowGroupInfo(false)}
          conversationId={conversation.id}
          groupName={conversation.name || 'Group'}
          groupDescription={conversation.description}
          members={conversation.members}
          onGroupUpdated={loadConversation}
        />
      )}

      {/* WebRTC Call Modal Overlay */}
      {callModal.isOpen && callModal.targetUser && (
        <CallModal
          isOpen={callModal.isOpen}
          onClose={() =>
            setCallModal({ isOpen: false, callType: 'audio', isIncoming: false, targetUser: null })
          }
          conversationId={conversationId}
          targetUser={callModal.targetUser}
          callType={callModal.callType}
          isIncoming={callModal.isIncoming}
          onInitiateCall={(targetId, type) => initiateCall(conversationId, targetId, type)}
          onSendSignal={(targetId, sig) => sendCallSignal(conversationId, targetId, sig)}
          onAcceptCall={(callerId) => acceptCall(conversationId, callerId)}
          onRejectCall={(callerId) => rejectCall(conversationId, callerId)}
          onHangupCall={(targetId) => hangupCall(conversationId, targetId)}
          onCallSignal={onCallSignal}
          onCallAccepted={onCallAccepted}
          onCallRejected={onCallRejected}
          onCallEnded={onCallEnded}
        />
      )}
    </div>
  );
}
