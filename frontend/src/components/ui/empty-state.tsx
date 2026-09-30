import React from 'react';
import { MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon = <MessageSquare className="w-8 h-8 text-blue-400" />,
  title,
  description,
  actionText,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center p-8 text-center min-h-[220px]', className)}>
      <div className="w-16 h-16 bg-blue-50/80 rounded-3xl flex items-center justify-center mb-4 shadow-sm">
        {icon}
      </div>
      <h3 className="text-base font-bold text-slate-900">{title}</h3>
      {description && <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">{description}</p>}
      {actionText && onAction && (
        <Button variant="primary" size="sm" onClick={onAction} className="mt-4">
          {actionText}
        </Button>
      )}
    </div>
  );
}
