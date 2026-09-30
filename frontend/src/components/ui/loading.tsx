import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function LoadingSpinner({ className, size = 'md' }: { className?: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };
  return <Loader2 className={cn('animate-spin text-blue-600', sizes[size], className)} />;
}

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('animate-pulse bg-slate-200/80 rounded-xl', className)} {...props} />;
}

export function ChatListSkeleton() {
  return (
    <div className="space-y-1 p-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center space-x-3 p-3">
          <Skeleton className="w-12 h-12 rounded-2xl shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex justify-between items-center">
              <Skeleton className="w-28 h-4" />
              <Skeleton className="w-10 h-3" />
            </div>
            <Skeleton className="w-44 h-3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function MessageHistorySkeleton() {
  return (
    <div className="space-y-4 p-4">
      <div className="flex justify-start">
        <Skeleton className="w-48 h-10 rounded-2xl rounded-bl-xs" />
      </div>
      <div className="flex justify-end">
        <Skeleton className="w-56 h-12 rounded-2xl rounded-br-xs" />
      </div>
      <div className="flex justify-start">
        <Skeleton className="w-40 h-9 rounded-2xl rounded-bl-xs" />
      </div>
      <div className="flex justify-end">
        <Skeleton className="w-64 h-14 rounded-2xl rounded-br-xs" />
      </div>
    </div>
  );
}
