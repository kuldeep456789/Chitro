import React from 'react';
import { cn } from '@/lib/utils';

export interface MessageBubbleProps {
  id: string;
  text: string;
  senderName?: string;
  createdAt: string;
  isOwn: boolean;
  isGroup?: boolean;
  isOptimistic?: boolean;
  className?: string;
}

export function MessageBubble({
  text,
  senderName,
  createdAt,
  isOwn,
  isGroup = false,
  isOptimistic = false,
  className,
}: MessageBubbleProps) {
  const formatTime = (iso: string) => {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className={cn('flex w-full mb-1 px-4', isOwn ? 'justify-end' : 'justify-start', className)}>
      <div className={cn('max-w-[78%] flex flex-col', isOwn ? 'items-end' : 'items-start')}>
        {!isOwn && isGroup && senderName && (
          <span className="text-[11px] font-semibold text-slate-400 mb-1 ml-1 truncate">
            {senderName}
          </span>
        )}
        <div
          className={cn(
            'px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words shadow-2xs transition',
            isOwn
              ? 'bg-blue-600 text-white rounded-br-xs'
              : 'bg-slate-100 text-slate-900 rounded-bl-xs',
            isOptimistic && 'opacity-65',
          )}
        >
          {text}
        </div>
        <span className="text-[10px] text-slate-400 mt-1 px-1 font-medium">
          {isOptimistic ? '●' : formatTime(createdAt)}
        </span>
      </div>
    </div>
  );
}
