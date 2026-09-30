import React from 'react';
import { cn } from '@/lib/utils';

export interface ProfileSectionProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function ProfileSection({ title, children, className }: ProfileSectionProps) {
  return (
    <div className={cn('space-y-1 mb-4', className)}>
      {title && (
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1 mb-2">
          {title}
        </h3>
      )}
      <div className="bg-white rounded-2xl border border-slate-100/80 shadow-2xs overflow-hidden">
        {children}
      </div>
    </div>
  );
}
