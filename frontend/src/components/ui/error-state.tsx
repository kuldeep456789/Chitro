import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div className={cn('p-6 bg-red-50/50 border border-red-100 rounded-2xl flex flex-col items-center text-center my-4', className)}>
      <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center text-red-600 mb-2">
        <AlertCircle className="w-5 h-5" />
      </div>
      <h4 className="text-sm font-bold text-red-900">{title}</h4>
      <p className="text-xs text-red-600 mt-1 max-w-xs">{message}</p>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          className="mt-3 border-red-200 text-red-700 hover:bg-red-100/50"
        >
          Try Again
        </Button>
      )}
    </div>
  );
}
