'use client';

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { MobileBottomNavigation } from './mobile-navigation';
import { useSocket } from '@/hooks/useSocket';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api';

export interface AppShellProps {
  children: React.ReactNode;
  showNavigation?: boolean;
  className?: string;
}

export function AppShell({
  children,
  showNavigation = true,
  className,
}: AppShellProps) {
  const { user } = useAuth();
  const { onConnectionRequest } = useSocket();
  const [pendingConnectionCount, setPendingConnectionCount] = useState(0);

  // Fetch initial pending count
  useEffect(() => {
    if (!user) return;
    apiClient('/connections/pending')
      .then((data: any[]) => setPendingConnectionCount(data?.length || 0))
      .catch(() => {});
  }, [user]);

  // Real-time: new connection request comes in
  useEffect(() => {
    if (!onConnectionRequest) return;
    const cleanup = onConnectionRequest(() => {
      setPendingConnectionCount((prev) => prev + 1);
    });
    return cleanup;
  }, [onConnectionRequest]);

  return (
    <div className="w-full max-w-md min-h-screen bg-white shadow-2xl relative flex flex-col border-x border-slate-200/80 mx-auto overflow-hidden">
      <main className={cn('flex-1 flex flex-col min-h-0 bg-white', className)}>
        {children}
      </main>
      {showNavigation && (
        <MobileBottomNavigation
          pendingConnectionCount={pendingConnectionCount}
        />
      )}
    </div>
  );
}
