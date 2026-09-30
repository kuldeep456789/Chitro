'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  MessageSquare, Search, Plus, Users, User as UserIcon,
  ChevronRight, LogOut, Loader2, X,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useSocket } from '@/hooks/useSocket';

interface ConversationPreview {
  id: string;
  type: 'DIRECT' | 'GROUP';
  name?: string;
  updatedAt: string;
  latestMessage?: { text: string; senderId: string; createdAt: string } | null;
  unreadCount?: number;
  members: Array<{ id: string; role: string; user: { id: string; displayName: string; username: string; avatarUrl?: string } }>;
}

interface SearchUser {
  id: string;
  displayName: string;
  username: string;
  avatarUrl?: string;
}

export default function ChatsPage() {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const { connected, onConversationNew, onConversationRead, onMessage } = useSocket();
  const [conversations, setConversations] = useState<ConversationPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<SearchUser[]>([]);
  const [groupSearch, setGroupSearch] = useState('');
  const [groupSearchResults, setGroupSearchResults] = useState<SearchUser[]>([]);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'direct' | 'groups'>('all');

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
      return;
    }
    if (user) {
      fetchConversations();
    }
  }, [user, isLoading]);

  // Real-time listener for newly created direct or group conversations
  useEffect(() => {
    if (!onConversationNew) return;
    const cleanup = onConversationNew((newConv) => {
      setConversations((prev) => {
        if (prev.some((c) => c.id === newConv.id)) return prev;
        return [newConv, ...prev];
      });
    });
    return cleanup;
  }, [onConversationNew]);

  // Real-time listener for read receipts to clear unread badge
  useEffect(() => {
    if (!onConversationRead) return;
    const cleanup = onConversationRead((data) => {
      setConversations((prev) =>
        prev.map((c) => (c.id === data.conversationId ? { ...c, unreadCount: 0 } : c))
      );
    });
    return cleanup;
  }, [onConversationRead]);

  // Real-time listener for new messages to update latest message & unread badge
  useEffect(() => {
    if (!onMessage) return;
    const cleanup = onMessage((msg) => {
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id === msg.conversationId) {
            const isOwn = msg.senderId === user?.id;
            return {
              ...c,
              latestMessage: {
                text: msg.text,
                senderId: msg.senderId,
                createdAt: msg.createdAt,
              },
              updatedAt: msg.createdAt,
              unreadCount: isOwn ? c.unreadCount : (c.unreadCount || 0) + 1,
            };
          }
          return c;
        })
      );
    });
    return cleanup;
  }, [onMessage, user]);

  const fetchConversations = async () => {
    try {
      const data = await apiClient('/conversations');
      setConversations(data || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  // Debounced user search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await apiClient(`/users/search?q=${encodeURIComponent(searchQuery)}`);
        setSearchResults(results || []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Debounced group member search
  useEffect(() => {
    if (!groupSearch.trim()) {
      setGroupSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const results = await apiClient(`/users/search?q=${encodeURIComponent(groupSearch)}`);
        setGroupSearchResults(results || []);
      } catch {
        setGroupSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [groupSearch]);

  const openDirectChat = async (targetUserId: string) => {
    try {
      const conv = await apiClient('/conversations/direct', {
        method: 'POST',
        body: JSON.stringify({ targetUserId }),
      });
      setShowSearch(false);
      setSearchQuery('');
      router.push(`/chats/${conv.id}`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const createGroup = async () => {
    const trimmed = groupName.trim();
    if (!trimmed || trimmed.length < 2) {
      alert('Please enter a group name with at least 2 characters');
      return;
    }
    setCreatingGroup(true);
    try {
      const conv = await apiClient('/conversations/groups', {
        method: 'POST',
        body: JSON.stringify({
          name: trimmed,
          memberIds: selectedMembers.map((m) => m.id),
        }),
      });
      setShowNewGroup(false);
      setGroupName('');
      setSelectedMembers([]);
      router.push(`/chats/${conv.id}`);
    } catch (err: any) {
      alert(err.message || 'Failed to create group');
    } finally {
      setCreatingGroup(false);
    }
  };

  const getConversationName = (conv: ConversationPreview) => {
    if (conv.name) return conv.name;
    const other = conv.members.find((m) => m.user.id !== user?.id);
    return other?.user.displayName || 'Unknown';
  };

  const getConversationAvatar = (conv: ConversationPreview) => {
    if (conv.type === 'GROUP') return null;
    const other = conv.members.find((m) => m.user.id !== user?.id);
    return other?.user.displayName?.[0]?.toUpperCase() || '?';
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60 * 1000) return 'now';
    if (diff < 60 * 60 * 1000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 24 * 60 * 60 * 1000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const filteredConvs = conversations.filter((c) =>
    activeTab === 'all' ? true : activeTab === 'direct' ? c.type === 'DIRECT' : c.type === 'GROUP'
  );

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-4 pt-12 pb-3 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-white fill-white/20" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Chitro</h1>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400' : 'bg-amber-400'}`} title={connected ? 'Online' : 'Connecting...'} />
            <button
              onClick={() => setShowNewGroup(true)}
              className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 hover:bg-blue-100 transition"
              title="New Group"
            >
              <Users className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition"
            >
              {showSearch ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Search bar */}
        {showSearch && (
          <div className="mb-2">
            <input
              autoFocus
              type="text"
              placeholder="Search people to message..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        )}

        {/* Tabs */}
        {!showSearch && (
          <div className="flex space-x-1 bg-slate-100 rounded-xl p-1">
            {(['all', 'direct', 'groups'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition capitalize ${
                  activeTab === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Search Results */}
      {showSearch && (
        <div className="flex-1 overflow-y-auto">
          {searching && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            </div>
          )}
          {!searching && searchQuery && searchResults.length === 0 && (
            <div className="text-center py-12 text-slate-400 text-sm">No users found</div>
          )}
          {!searching && !searchQuery && (
            <div className="text-center py-12 text-slate-400 text-sm">Type to search for people</div>
          )}
          {searchResults.map((u) => (
            <button
              key={u.id}
              onClick={() => openDirectChat(u.id)}
              className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-slate-50 transition"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold text-sm shrink-0">
                {u.displayName[0]?.toUpperCase()}
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-slate-900">{u.displayName}</p>
                <p className="text-xs text-slate-400">@{u.username}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 ml-auto" />
            </button>
          ))}
        </div>
      )}

      {/* Conversations List */}
      {!showSearch && (
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          )}
          {!loading && filteredConvs.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
              <div className="w-16 h-16 bg-blue-50 rounded-3xl flex items-center justify-center mb-4">
                <MessageSquare className="w-8 h-8 text-blue-400" />
              </div>
              <p className="text-slate-700 font-semibold">No conversations yet</p>
              <p className="text-slate-400 text-sm mt-1">
                {activeTab === 'groups' ? 'Create a group to get started' : 'Search for someone to message'}
              </p>
            </div>
          )}
          {filteredConvs.map((conv) => (
            <Link
              key={conv.id}
              href={`/chats/${conv.id}`}
              className="flex items-center space-x-3 px-4 py-3.5 hover:bg-slate-50 active:bg-slate-100 border-b border-slate-50 transition"
            >
              <div className="relative shrink-0">
                {conv.type === 'GROUP' ? (
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold">
                    {conv.name?.[0]?.toUpperCase() || 'G'}
                  </div>
                ) : (
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center text-white font-bold">
                    {getConversationAvatar(conv)}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className={`text-sm truncate ${conv.unreadCount && conv.unreadCount > 0 ? 'font-bold text-slate-900' : 'font-semibold text-slate-900'}`}>
                    {getConversationName(conv)}
                  </p>
                  <span className={`text-[11px] shrink-0 ml-2 ${conv.unreadCount && conv.unreadCount > 0 ? 'text-blue-600 font-semibold' : 'text-slate-400'}`}>
                    {formatTime(conv.latestMessage?.createdAt || conv.updatedAt)}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <p className={`text-xs truncate ${conv.unreadCount && conv.unreadCount > 0 ? 'text-slate-800 font-medium' : 'text-slate-400'}`}>
                    {conv.latestMessage?.text || 'No messages yet'}
                  </p>
                  {Boolean(conv.unreadCount && conv.unreadCount > 0) && (
                    <span className="ml-2 px-1.5 py-0.2 min-w-[18px] h-4.5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0 shadow-xs shadow-blue-500/30">
                      {conv.unreadCount! > 99 ? '99+' : conv.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* New Group Modal */}
      {showNewGroup && (
        <div className="absolute inset-0 bg-black/40 z-50 flex items-end">
          <div className="w-full bg-white rounded-t-3xl p-5 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-slate-900">New Group</h2>
              <button onClick={() => { setShowNewGroup(false); setGroupName(''); setSelectedMembers([]); }}>
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <input
              placeholder="Group name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
            <input
              placeholder="Search members..."
              value={groupSearch}
              onChange={(e) => setGroupSearch(e.target.value)}
              className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50 mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
            {selectedMembers.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {selectedMembers.map((m) => (
                  <span key={m.id} className="flex items-center space-x-1 bg-blue-100 text-blue-700 text-xs font-medium px-2 py-1 rounded-lg">
                    <span>{m.displayName}</span>
                    <button onClick={() => setSelectedMembers((prev) => prev.filter((x) => x.id !== m.id))}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex-1 overflow-y-auto min-h-0">
              {groupSearchResults.map((u) => {
                const isSelected = selectedMembers.some((m) => m.id === u.id);
                return (
                  <button
                    key={u.id}
                    onClick={() => {
                      setSelectedMembers((prev) =>
                        isSelected ? prev.filter((m) => m.id !== u.id) : [...prev, u]
                      );
                      setGroupSearch('');
                    }}
                    className={`w-full flex items-center space-x-3 px-2 py-2.5 rounded-xl mb-1 transition ${isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                  >
                    <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0">
                      {u.displayName[0]}
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{u.displayName}</p>
                      <p className="text-xs text-slate-400">@{u.username}</p>
                    </div>
                    {isSelected && <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center shrink-0"><span className="text-white text-xs">✓</span></div>}
                  </button>
                );
              })}
            </div>
            {selectedMembers.length === 0 && (
              <p className="text-xs text-slate-400 my-2 text-center">
                No members selected yet. You can add members anytime after creating the group.
              </p>
            )}
            <button
              onClick={createGroup}
              disabled={creatingGroup || !groupName.trim() || groupName.trim().length < 2}
              className="mt-3 w-full py-3 bg-blue-600 text-white font-semibold rounded-xl disabled:opacity-50 flex items-center justify-center transition"
            >
              {creatingGroup ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : selectedMembers.length > 0 ? (
                `Create Group (${selectedMembers.length} member${selectedMembers.length > 1 ? 's' : ''})`
              ) : (
                'Create Group'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
