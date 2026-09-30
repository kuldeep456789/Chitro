'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessageSquare, Users, User as UserIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UnreadBadge } from '../ui/badge';

export interface MobileNavigationProps {
  unreadChatCount?: number;
  pendingConnectionCount?: number;
  className?: string;
}

export function MobileBottomNavigation({
  unreadChatCount = 0,
  pendingConnectionCount = 0,
  className,
}: MobileNavigationProps) {
  const pathname = usePathname();

  // Hide bottom navigation inside active individual chat conversations (/chats/[id])
  if (pathname?.match(/^\/chats\/[^/]+$/)) {
    return null;
  }

  const tabs = [
    {
      name: 'Chats',
      href: '/chats',
      icon: MessageSquare,
      active: pathname === '/chats',
      badge: unreadChatCount,
    },
    {
      name: 'Connections',
      href: '/connections',
      icon: Users,
      active: pathname === '/connections',
      badge: pendingConnectionCount,
    },
    {
      name: 'Profile',
      href: '/profile',
      icon: UserIcon,
      active: pathname === '/profile',
      badge: 0,
    },
  ];

  return (
    <nav
      className={cn(
        'sticky bottom-0 z-40 bg-white border-t border-slate-100 px-6 py-2.5 grid grid-cols-3 gap-1 shadow-xs',
        className,
      )}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <Link
            key={tab.name}
            href={tab.href}
            className={cn(
              'flex flex-col items-center justify-center space-y-1 py-1 px-2 rounded-xl transition duration-150 relative',
              tab.active ? 'text-blue-600 font-semibold' : 'text-slate-400 hover:text-slate-600',
            )}
          >
            <div className="relative">
              <Icon className={cn('w-5 h-5', tab.active && 'stroke-[2.5px]')} />
              {tab.badge > 0 && (
                <div className="absolute -top-1.5 -right-2.5">
                  <UnreadBadge count={tab.badge} className="text-[9px] h-4 min-w-[16px] px-1" />
                </div>
              )}
            </div>
            <span className="text-[10px] tracking-tight">{tab.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}
