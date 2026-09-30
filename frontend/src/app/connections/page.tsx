'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, UserPlus, Search, Loader2, X, Check, UserMinus,
  MessageSquare, Clock, ChevronRight, UserCheck,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useSocket } from '@/hooks/useSocket';

interface ConnectionUser {
  id: string;
  displayName: string;
  username: string;
  avatarUrl?: string;
  bio?: string;
}

interface Connection {
  id: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';
  requesterId: string;
  recipientId: string;
  requester: ConnectionUser;
  recipient: ConnectionUser;
  createdAt: string;
}

interface SearchUser {
  id: string;
  displayName: string;
  username: string;
  avatarUrl?: string;
}

type Tab = 'connections' | 'pending' | 'discover';

export default function ConnectionsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const { onConnectionRequest, onConnectionAccepted } = useSocket();

  const [activeTab, setActiveTab] = useState<Tab>('connections');
  const [connections, setConnections] = useState<Connection[]>([]);
  const [pendingReceived, setPendingReceived] = useState<Connection[]>([]);
  const [pendingSent, setPendingSent] = useState<Connection[]>([]);
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading]);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    try {
      const [conns, pending, sent] = await Promise.all([
        apiClient('/connections'),
        apiClient('/connections/pending'),
        apiClient('/connections/sent'),
      ]);
      setConnections(conns || []);
      setPendingReceived(pending || []);
      setPendingSent(sent || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) fetchAll();
  }, [user]);

  // Real-time listeners
  useEffect(() => {
    if (!onConnectionRequest) return;
    const cleanup = onConnectionRequest((data: any) => {
      fetchAll();
    });
    return cleanup;
  }, [onConnectionRequest, fetchAll]);

  useEffect(() => {
    if (!onConnectionAccepted) return;
    const cleanup = onConnectionAccepted((data: any) => {
      fetchAll();
    });
    return cleanup;
  }, [onConnectionAccepted, fetchAll]);

  // Debounced search
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

  const sendRequest = async (recipientId: string) => {
    setActionLoading(recipientId);
    try {
      await apiClient('/connections/request', {
        method: 'POST',
        body: JSON.stringify({ recipientId }),
      });
      await fetchAll();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const acceptRequest = async (connectionId: string) => {
    setActionLoading(connectionId);
    try {
      await apiClient(`/connections/${connectionId}/accept`, { method: 'PATCH' });
      await fetchAll();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const rejectRequest = async (connectionId: string) => {
    setActionLoading(connectionId);
    try {
      await apiClient(`/connections/${connectionId}/reject`, { method: 'PATCH' });
      await fetchAll();
    } finally {
      setActionLoading(null);
    }
  };

  const removeConnection = async (connectionId: string) => {
    setActionLoading(connectionId);
    try {
      await apiClient(`/connections/${connectionId}`, { method: 'DELETE' });
      await fetchAll();
    } finally {
      setActionLoading(null);
    }
  };

  const openChat = async (targetUserId: string) => {
    try {
      const conv = await apiClient('/conversations/direct', {
        method: 'POST',
        body: JSON.stringify({ targetUserId }),
      });
      router.push(`/chats/${conv.id}`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const getPeerUser = (conn: Connection) => {
    return conn.requesterId === user?.id ? conn.recipient : conn.requester;
  };

  const getConnectionStatusForUser = (userId: string) => {
    if (connections.some(c => getPeerUser(c).id === userId)) return 'connected';
    if (pendingSent.some(c => c.recipientId === userId)) return 'sent';
    if (pendingReceived.some(c => c.requesterId === userId)) return 'received';
    return 'none';
  };

  const getConnectionIdForUser = (userId: string) => {
    const conn = [...connections, ...pendingSent, ...pendingReceived].find(
      c => getPeerUser(c).id === userId
    );
    return conn?.id || null;
  };

  const AvatarCircle = ({ user: u, size = 'md' }: { user: ConnectionUser | SearchUser; size?: 'sm' | 'md' | 'lg' }) => {
    const sizes = { sm: 'w-9 h-9 text-sm', md: 'w-12 h-12 text-base', lg: 'w-14 h-14 text-lg' };
    return (
      <div className={`${sizes[size]} bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold shrink-0`}>
        {u.displayName[0]?.toUpperCase()}
      </div>
    );
  };

  const pendingTotal = pendingReceived.length;

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-4 pt-12 pb-3 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center">
              <Users className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Connections</h1>
            {pendingTotal > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                {pendingTotal}
              </span>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 bg-slate-100 rounded-xl p-1">
          {([
            { id: 'connections', label: 'My Connections', count: connections.length },
            { id: 'pending', label: 'Requests', count: pendingTotal },
            { id: 'discover', label: 'Discover' },
          ] as { id: Tab; label: string; count?: number }[]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-1.5 text-[11px] font-semibold rounded-lg transition relative ${
                activeTab === tab.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`ml-1 text-[9px] font-bold px-1 py-0.5 rounded-full ${
                  tab.id === 'pending' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">

        {/* === MY CONNECTIONS TAB === */}
        {activeTab === 'connections' && (
          <div>
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              </div>
            ) : connections.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
                <div className="w-16 h-16 bg-indigo-50 rounded-3xl flex items-center justify-center mb-4">
                  <UserCheck className="w-8 h-8 text-indigo-400" />
                </div>
                <p className="text-slate-700 font-semibold">No connections yet</p>
                <p className="text-slate-400 text-sm mt-1">Discover people in the Discover tab</p>
              </div>
            ) : (
              connections.map((conn) => {
                const peer = getPeerUser(conn);
                return (
                  <div key={conn.id} className="flex items-center space-x-3 px-4 py-3.5 border-b border-slate-50">
                    <AvatarCircle user={peer} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{peer.displayName}</p>
                      <p className="text-xs text-slate-400">@{peer.username}</p>
                    </div>
                    <div className="flex items-center space-x-2 shrink-0">
                      <button
                        onClick={() => openChat(peer.id)}
                        className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 hover:bg-blue-100 transition"
                        title="Message"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => removeConnection(conn.id)}
                        disabled={actionLoading === conn.id}
                        className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 transition"
                        title="Remove connection"
                      >
                        {actionLoading === conn.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <UserMinus className="w-3.5 h-3.5" />
                        }
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* === PENDING/REQUESTS TAB === */}
        {activeTab === 'pending' && (
          <div>
            {/* Received */}
            {pendingReceived.length > 0 && (
              <div>
                <div className="px-4 py-2 bg-slate-50 border-b border-slate-100">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Received</p>
                </div>
                {pendingReceived.map((conn) => {
                  const peer = conn.requester;
                  return (
                    <div key={conn.id} className="flex items-center space-x-3 px-4 py-3.5 border-b border-slate-50">
                      <AvatarCircle user={peer} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{peer.displayName}</p>
                        <p className="text-xs text-slate-400">@{peer.username}</p>
                      </div>
                      <div className="flex items-center space-x-1.5 shrink-0">
                        <button
                          onClick={() => acceptRequest(conn.id)}
                          disabled={actionLoading === conn.id}
                          className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg flex items-center space-x-1 hover:bg-blue-700 transition"
                        >
                          {actionLoading === conn.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                          <span>Accept</span>
                        </button>
                        <button
                          onClick={() => rejectRequest(conn.id)}
                          disabled={actionLoading === conn.id}
                          className="px-3 py-1.5 bg-slate-100 text-slate-600 text-xs font-semibold rounded-lg flex items-center space-x-1 hover:bg-slate-200 transition"
                        >
                          <X className="w-3 h-3" />
                          <span>Decline</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Sent */}
            {pendingSent.length > 0 && (
              <div>
                <div className="px-4 py-2 bg-slate-50 border-b border-slate-100">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Sent</p>
                </div>
                {pendingSent.map((conn) => {
                  const peer = conn.recipient;
                  return (
                    <div key={conn.id} className="flex items-center space-x-3 px-4 py-3.5 border-b border-slate-50">
                      <AvatarCircle user={peer} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{peer.displayName}</p>
                        <p className="text-xs text-slate-400">@{peer.username}</p>
                      </div>
                      <div className="flex items-center space-x-1.5 shrink-0">
                        <div className="px-3 py-1.5 bg-amber-50 text-amber-600 text-xs font-semibold rounded-lg flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>Pending</span>
                        </div>
                        <button
                          onClick={() => removeConnection(conn.id)}
                          disabled={actionLoading === conn.id}
                          className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 transition"
                          title="Cancel request"
                        >
                          {actionLoading === conn.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {pendingReceived.length === 0 && pendingSent.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
                <div className="w-16 h-16 bg-amber-50 rounded-3xl flex items-center justify-center mb-4">
                  <UserPlus className="w-8 h-8 text-amber-400" />
                </div>
                <p className="text-slate-700 font-semibold">No pending requests</p>
                <p className="text-slate-400 text-sm mt-1">Find people to connect with</p>
              </div>
            )}
          </div>
        )}

        {/* === DISCOVER TAB === */}
        {activeTab === 'discover' && (
          <div>
            {/* Search Bar */}
            <div className="px-4 py-3 border-b border-slate-100 sticky top-0 bg-white z-10">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Search by name or @username..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-3 text-slate-400"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {searching ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              </div>
            ) : !searchQuery ? (
              <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
                <div className="w-16 h-16 bg-blue-50 rounded-3xl flex items-center justify-center mb-4">
                  <Search className="w-8 h-8 text-blue-400" />
                </div>
                <p className="text-slate-700 font-semibold">Search for people</p>
                <p className="text-slate-400 text-sm mt-1">Find friends by name or username</p>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm">
                No users found for &quot;{searchQuery}&quot;
              </div>
            ) : (
              searchResults
                .filter((u) => u.id !== user?.id)
                .map((u) => {
                  const status = getConnectionStatusForUser(u.id);
                  const connectionId = getConnectionIdForUser(u.id);
                  return (
                    <div key={u.id} className="flex items-center space-x-3 px-4 py-3.5 border-b border-slate-50">
                      <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold text-sm shrink-0">
                        {u.displayName[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{u.displayName}</p>
                        <p className="text-xs text-slate-400">@{u.username}</p>
                      </div>
                      <div className="shrink-0">
                        {status === 'connected' ? (
                          <button
                            onClick={() => openChat(u.id)}
                            className="px-3 py-1.5 bg-blue-50 text-blue-600 text-xs font-semibold rounded-lg flex items-center space-x-1 hover:bg-blue-100 transition"
                          >
                            <MessageSquare className="w-3 h-3" />
                            <span>Message</span>
                          </button>
                        ) : status === 'sent' ? (
                          <div className="px-3 py-1.5 bg-amber-50 text-amber-600 text-xs font-semibold rounded-lg flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>Sent</span>
                          </div>
                        ) : status === 'received' ? (
                          <button
                            onClick={() => connectionId && acceptRequest(connectionId)}
                            disabled={actionLoading === connectionId}
                            className="px-3 py-1.5 bg-green-50 text-green-600 text-xs font-semibold rounded-lg flex items-center space-x-1 hover:bg-green-100 transition"
                          >
                            <Check className="w-3 h-3" />
                            <span>Accept</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => sendRequest(u.id)}
                            disabled={actionLoading === u.id}
                            className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg flex items-center space-x-1 hover:bg-blue-700 transition"
                          >
                            {actionLoading === u.id
                              ? <Loader2 className="w-3 h-3 animate-spin" />
                              : <UserPlus className="w-3 h-3" />
                            }
                            <span>Connect</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
