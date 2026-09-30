import React from 'react';
import { cn } from '@/lib/utils';

export interface OnlineIndicatorProps {
  isOnline: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showPulse?: boolean;
}

export function OnlineIndicator({
  isOnline,
  size = 'md',
  className,
  showPulse = false,
}: OnlineIndicatorProps) {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3.5 h-3.5',
  };

  return (
    <div className="relative flex items-center justify-center">
      {isOnline && showPulse && (
        <span
          className={cn(
            'absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping',
            sizeClasses[size],
          )}
        />
      )}
      <span
        className={cn(
          'inline-block rounded-full border border-white shrink-0 transition-colors',
          isOnline ? 'bg-emerald-500' : 'bg-slate-300',
          sizeClasses[size],
          className,
        )}
        title={isOnline ? 'Online' : 'Offline'}
      />
    </div>
  );
}
