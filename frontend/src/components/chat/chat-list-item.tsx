import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { UserAvatar } from '../ui/avatar';
import { UnreadBadge } from '../ui/badge';

export interface ChatListItemProps {
  id: string;
  type: 'DIRECT' | 'GROUP';
  name: string;
  avatarUrl?: string | null;
  lastMessage?: string | null;
  updatedAt: string;
  unreadCount?: number;
  isOnline?: boolean;
}

export function ChatListItem({
  id,
  type,
  name,
  avatarUrl,
  lastMessage,
  updatedAt,
  unreadCount = 0,
  isOnline = false,
}: ChatListItemProps) {
  const formatTime = (iso: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60 * 1000) return 'now';
    if (diff < 60 * 60 * 1000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 24 * 60 * 60 * 1000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <Link
      href={`/chats/${id}`}
      className="flex items-center space-x-3.5 px-4 py-3.5 hover:bg-slate-50 active:bg-slate-100 border-b border-slate-100/60 transition duration-150"
    >
      <UserAvatar
        name={name}
        avatarUrl={avatarUrl}
        isGroup={type === 'GROUP'}
        isOnline={isOnline}
        showStatus={type === 'DIRECT'}
        size="lg"
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-900 truncate tracking-tight">{name}</p>
          <span className="text-[11px] text-slate-400 font-medium shrink-0 ml-2">
            {formatTime(updatedAt)}
          </span>
        </div>
        <div className="flex items-center justify-between mt-1">
          <p className="text-xs text-slate-500 truncate max-w-[200px]">
            {lastMessage || 'No messages yet'}
          </p>
          {unreadCount > 0 && <UnreadBadge count={unreadCount} className="ml-2 shrink-0" />}
        </div>
      </div>
    </Link>
  );
}
