import React, { useRef } from 'react';
import { Send, Paperclip, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MessageComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onAttachmentClick?: () => void;
  isSending?: boolean;
  placeholder?: string;
  className?: string;
}

export function MessageComposer({
  value,
  onChange,
  onSend,
  onAttachmentClick,
  isSending = false,
  placeholder = 'Type a message...',
  className,
}: MessageComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !isSending) {
        onSend();
      }
    }
  };

  return (
    <div
      className={cn(
        'bg-white border-t border-slate-100 px-3 py-3 flex items-end space-x-2 sticky bottom-0 z-10',
        className,
      )}
    >
      {onAttachmentClick && (
        <button
          type="button"
          onClick={onAttachmentClick}
          className="w-10 h-10 rounded-2xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition shrink-0"
          title="Add attachment"
        >
          <Paperclip className="w-5 h-5" />
        </button>
      )}

      <textarea
        ref={textareaRef}
        rows={1}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        className="flex-1 px-4 py-2.5 text-sm bg-slate-100 rounded-2xl resize-none max-h-28 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:bg-white focus:border focus:border-blue-200 transition placeholder:text-slate-400"
        style={{ overflowY: value.split('\n').length > 4 ? 'scroll' : 'hidden' }}
      />

      <button
        type="button"
        onClick={onSend}
        disabled={!value.trim() || isSending}
        className="w-10 h-10 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] rounded-2xl flex items-center justify-center text-white shadow-md shadow-blue-600/25 disabled:opacity-40 disabled:active:scale-100 transition shrink-0"
        title="Send message"
      >
        {isSending ? (
          <Loader2 className="w-4 h-4 animate-spin text-white" />
        ) : (
          <Send className="w-4 h-4 text-white" />
        )}
      </button>
    </div>
  );
}
