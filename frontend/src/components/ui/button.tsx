import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled,
      leftIcon,
      rightIcon,
      children,
      ...props
    },
    ref,
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-semibold rounded-xl transition duration-150 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100';

    const variants = {
      primary: 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-600/20',
      secondary: 'bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-200/60',
      outline: 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 shadow-sm',
      ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900',
      danger: 'bg-red-600 text-white hover:bg-red-700 shadow-md shadow-red-600/20',
    };

    const sizes = {
      sm: 'py-2 px-3 text-xs gap-1.5',
      md: 'py-3 px-4 text-sm gap-2',
      lg: 'py-3.5 px-5 text-base gap-2.5',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}
        <span>{children}</span>
        {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  },
);

Button.displayName = 'Button';
