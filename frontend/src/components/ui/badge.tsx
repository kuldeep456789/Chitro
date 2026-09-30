import React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info';
  size?: 'sm' | 'md';
}

export function Badge({
  className,
  variant = 'primary',
  size = 'md',
  children,
  ...props
}: BadgeProps) {
  const baseStyles = 'inline-flex items-center font-medium rounded-full';

  const variants = {
    primary: 'bg-blue-100 text-blue-700',
    secondary: 'bg-slate-100 text-slate-600',
    success: 'bg-emerald-100 text-emerald-700',
    danger: 'bg-red-100 text-red-700',
    warning: 'bg-amber-100 text-amber-700',
    info: 'bg-cyan-100 text-cyan-700',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-1 text-xs',
  };

  return (
    <span className={cn(baseStyles, variants[variant], sizes[size], className)} {...props}>
      {children}
    </span>
  );
}

export function UnreadBadge({ count, className }: { count: number; className?: string }) {
  if (!count || count <= 0) return null;
  const displayCount = count > 99 ? '99+' : count;

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-blue-600 text-white font-bold text-[11px] rounded-full shadow-sm',
        className,
      )}
    >
      {displayCount}
    </span>
  );
}
