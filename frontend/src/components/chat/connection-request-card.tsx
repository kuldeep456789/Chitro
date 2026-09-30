import React from 'react';
import { UserAvatar } from '../ui/avatar';
import { Button } from '../ui/button';
import { Card } from '../ui/card';

export interface ConnectionRequestCardProps {
  id: string;
  user: {
    id: string;
    displayName: string;
    username: string;
    avatarUrl?: string | null;
    bio?: string | null;
  };
  type: 'incoming' | 'sent';
  onAccept?: () => void;
  onReject?: () => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

export function ConnectionRequestCard({
  user,
  type,
  onAccept,
  onReject,
  onCancel,
  isLoading = false,
}: ConnectionRequestCardProps) {
  return (
    <Card className="p-4 mb-3">
      <div className="flex items-center space-x-3.5">
        <UserAvatar name={user.displayName} avatarUrl={user.avatarUrl} size="lg" />
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-slate-900 truncate tracking-tight">
            {user.displayName}
          </h4>
          <p className="text-xs text-slate-400">@{user.username}</p>
          {user.bio && <p className="text-xs text-slate-600 truncate mt-1">{user.bio}</p>}
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-slate-100">
        {type === 'incoming' ? (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={onReject}
              disabled={isLoading}
              className="px-4"
            >
              Decline
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={onAccept}
              isLoading={isLoading}
              className="px-4"
            >
              Accept
            </Button>
          </>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            isLoading={isLoading}
            className="text-slate-600 border-slate-200"
          >
            Cancel Request
          </Button>
        )}
      </div>
    </Card>
  );
}
