import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Phone, Video, MoreVertical } from 'lucide-react';
import { UserAvatar } from '../ui/avatar';
import { cn } from '@/lib/utils';

export interface ConversationHeaderProps {
  title: string;
  subtitle?: string;
  avatarUrl?: string | null;
  isGroup?: boolean;
  isOnline?: boolean;
  onVoiceCall?: () => void;
  onVideoCall?: () => void;
  onMoreOptions?: () => void;
  className?: string;
}

export function ConversationHeader({
  title,
  subtitle,
  avatarUrl,
  isGroup = false,
  isOnline = false,
  onVoiceCall,
  onVideoCall,
  onMoreOptions,
  className,
}: ConversationHeaderProps) {
  return (
    <div
      className={cn(
        'bg-white border-b border-slate-100 px-4 py-3 pt-12 flex items-center space-x-3 sticky top-0 z-20 shadow-2xs',
        className,
      )}
    >
      <Link
        href="/chats"
        className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-600 hover:bg-slate-100 active:bg-slate-200 transition shrink-0"
        title="Back to chats"
      >
        <ArrowLeft className="w-5 h-5" />
      </Link>

      <UserAvatar
        name={title}
        avatarUrl={avatarUrl}
        isGroup={isGroup}
        isOnline={isOnline}
        showStatus={!isGroup}
        size="md"
      />

      <div className="flex-1 min-w-0">
        <h2 className="font-bold text-slate-900 text-sm truncate tracking-tight">{title}</h2>
        <p className="text-xs text-slate-400 truncate mt-0.5">
          {subtitle || (isGroup ? 'Group Conversation' : isOnline ? 'Online' : 'Offline')}
        </p>
      </div>

      <div className="flex items-center space-x-1 shrink-0">
        <button
          onClick={onVoiceCall}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition"
          title="Voice Call"
        >
          <Phone className="w-4 h-4" />
        </button>

        <button
          onClick={onVideoCall}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition"
          title="Video Call"
        >
          <Video className="w-4 h-4" />
        </button>

        {onMoreOptions && (
          <button
            onClick={onMoreOptions}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-600 hover:bg-slate-100 transition"
            title="Conversation Options"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
