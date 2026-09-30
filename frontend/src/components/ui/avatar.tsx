import React from 'react';
import { cn } from '@/lib/utils';
import { OnlineIndicator } from './online-indicator';

export interface UserAvatarProps {
  name: string;
  avatarUrl?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  isGroup?: boolean;
  isOnline?: boolean;
  showStatus?: boolean;
  className?: string;
}

export function UserAvatar({
  name,
  avatarUrl,
  size = 'md',
  isGroup = false,
  isOnline = false,
  showStatus = false,
  className,
}: UserAvatarProps) {
  const [imageError, setImageError] = React.useState(false);

  const initial = (name ? name.trim()[0] : '?').toUpperCase();

  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px] rounded-lg',
    sm: 'w-8 h-8 text-xs rounded-xl',
    md: 'w-10 h-10 text-sm rounded-2xl',
    lg: 'w-12 h-12 text-base rounded-2xl',
    xl: 'w-20 h-20 text-2xl rounded-3xl',
  };

  const statusSizes = {
    xs: 'sm',
    sm: 'sm',
    md: 'md',
    lg: 'md',
    xl: 'lg',
  } as const;

  const bgGradient = isGroup
    ? 'bg-gradient-to-br from-purple-500 to-indigo-600'
    : 'bg-gradient-to-br from-blue-600 to-cyan-500';

  return (
    <div className="relative inline-block shrink-0">
      <div
        className={cn(
          'flex items-center justify-center font-bold text-white shadow-sm overflow-hidden select-none',
          bgGradient,
          sizeClasses[size],
          className,
        )}
      >
        {avatarUrl && !imageError ? (
          <img
            src={avatarUrl}
            alt={name}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <span>{initial}</span>
        )}
      </div>

      {showStatus && !isGroup && (
        <div className="absolute -bottom-0.5 -right-0.5 ring-2 ring-white rounded-full">
          <OnlineIndicator isOnline={isOnline} size={statusSizes[size]} />
        </div>
      )}
    </div>
  );
}
