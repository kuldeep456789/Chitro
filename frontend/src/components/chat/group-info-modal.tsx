'use client';

import React, { useState, useEffect } from 'react';
import {
  X, Users, UserPlus, Trash2, LogOut, Edit2, Check, Loader2, ShieldCheck, UserCheck, Search,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';

interface Member {
  id: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  user: {
    id: string;
    displayName: string;
    username: string;
    avatarUrl?: string;
  };
}

interface GroupInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string;
  groupName: string;
  groupDescription?: string;
  members: Member[];
  onGroupUpdated: () => void;
}

export function GroupInfoModal({
  isOpen,
  onClose,
  conversationId,
  groupName,
  groupDescription,
  members,
  onGroupUpdated,
}: GroupInfoModalProps) {
  const { user } = useAuth();
  const router = useRouter();

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(groupName);
  const [description, setDescription] = useState(groupDescription || '');
  const [savingDetails, setSavingDetails] = useState(false);

  // Add members state
  const [showAddMember, setShowAddMember] = useState(false);
  const [connections, setConnections] = useState<any[]>([]);
  const [loadingConnections, setLoadingConnections] = useState(false);
  const [selectedToAdd, setSelectedToAdd] = useState<string[]>([]);
  const [addingMembers, setAddingMembers] = useState(false);
  const [connectionSearch, setConnectionSearch] = useState('');

  // Action states
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    setName(groupName);
    setDescription(groupDescription || '');
  }, [groupName, groupDescription]);

  const currentMember = members.find((m) => m.user.id === user?.id);
  const isOwnerOrAdmin = currentMember?.role === 'OWNER' || currentMember?.role === 'ADMIN';

  // Load user connections to add
  const handleOpenAddMember = async () => {
    setShowAddMember(true);
    setLoadingConnections(true);
    try {
      const data = await apiClient('/connections');
      const existingUserIds = new Set(members.map((m) => m.user.id));
      const available = (data || []).filter((c: any) => {
        const other = c.requesterId === user?.id ? c.recipient : c.requester;
        return other && !existingUserIds.has(other.id);
      });
      setConnections(available);
    } catch {
      // ignore
    } finally {
      setLoadingConnections(false);
    }
  };

  const handleSaveDetails = async () => {
    if (!name.trim()) return;
    setSavingDetails(true);
    try {
      await apiClient(`/conversations/${conversationId}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined }),
      });
      setIsEditing(false);
      onGroupUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to update group');
    } finally {
      setSavingDetails(false);
    }
  };

  const handleAddMembersSubmit = async () => {
    if (selectedToAdd.length === 0) return;
    setAddingMembers(true);
    try {
      await apiClient(`/conversations/${conversationId}/members`, {
        method: 'POST',
        body: JSON.stringify({ memberIds: selectedToAdd }),
      });
      setSelectedToAdd([]);
      setShowAddMember(false);
      onGroupUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to add members');
    } finally {
      setAddingMembers(false);
    }
  };

  const handleRemoveMember = async (targetUserId: string, targetName: string) => {
    if (!confirm(`Are you sure you want to remove ${targetName} from the group?`)) return;
    setRemovingMemberId(targetUserId);
    try {
      await apiClient(`/conversations/${conversationId}/members/${targetUserId}`, {
        method: 'DELETE',
      });
      onGroupUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to remove member');
    } finally {
      setRemovingMemberId(null);
    }
  };

  const handleLeaveGroup = async () => {
    if (!confirm('Are you sure you want to leave this group?')) return;
    setLeaving(true);
    try {
      await apiClient(`/conversations/${conversationId}/leave`, {
        method: 'POST',
      });
      router.push('/chats');
    } catch (err: any) {
      alert(err.message || 'Failed to leave group');
      setLeaving(false);
    }
  };

  if (!isOpen) return null;

  const filteredConnections = connections.filter((c) => {
    const other = c.requesterId === user?.id ? c.recipient : c.requester;
    if (!other) return false;
    const q = connectionSearch.toLowerCase();
    return (
      other.displayName?.toLowerCase().includes(q) ||
      other.username?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-slide-up sm:animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">Group Info</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1 p-5 space-y-6">
          {/* Group Avatar & Name Header */}
          <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center text-white font-extrabold text-3xl shadow-lg shadow-indigo-500/25 mb-3">
              {groupName[0]?.toUpperCase() || 'G'}
            </div>

            {isEditing ? (
              <div className="w-full space-y-3 mt-2">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Group Name"
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl text-center font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm"
                />
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Group description (optional)"
                  rows={2}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                />
                <div className="flex justify-center space-x-2">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveDetails}
                    disabled={savingDetails || !name.trim()}
                    className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 flex items-center space-x-1"
                  >
                    {savingDetails && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Save</span>
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-center space-x-2">
                  <h3 className="text-lg font-bold text-slate-900">{groupName}</h3>
                  {isOwnerOrAdmin && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                      title="Edit group details"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                {groupDescription ? (
                  <p className="text-xs text-slate-500 mt-1 max-w-xs">{groupDescription}</p>
                ) : (
                  <p className="text-xs text-slate-400 mt-0.5">Group · {members.length} members</p>
                )}
              </div>
            )}
          </div>

          {/* Members Section Header & Add Button */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Members ({members.length})
              </span>
              {isOwnerOrAdmin && !showAddMember && (
                <button
                  onClick={handleOpenAddMember}
                  className="flex items-center space-x-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 px-2.5 py-1 rounded-xl transition"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Add Member</span>
                </button>
              )}
            </div>

            {/* Add Member Drawer / Sub-section */}
            {showAddMember && (
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 mb-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Add from connections</span>
                  <button
                    onClick={() => {
                      setShowAddMember(false);
                      setSelectedToAdd([]);
                    }}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={connectionSearch}
                    onChange={(e) => setConnectionSearch(e.target.value)}
                    placeholder="Filter connections..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="max-h-40 overflow-y-auto space-y-1">
                  {loadingConnections && (
                    <div className="py-4 text-center">
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-600 mx-auto" />
                    </div>
                  )}
                  {!loadingConnections && filteredConnections.length === 0 && (
                    <p className="text-[11px] text-slate-400 py-3 text-center">
                      No connections available to add
                    </p>
                  )}
                  {filteredConnections.map((c) => {
                    const other = c.requesterId === user?.id ? c.recipient : c.requester;
                    const isSelected = selectedToAdd.includes(other.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setSelectedToAdd((prev) =>
                            isSelected ? prev.filter((id) => id !== other.id) : [...prev, other.id]
                          );
                        }}
                        className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition ${
                          isSelected ? 'bg-indigo-50 border border-indigo-200' : 'hover:bg-white'
                        }`}
                      >
                        <div className="flex items-center space-x-2 min-w-0">
                          <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
                            {other.displayName[0]?.toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-900 truncate">
                              {other.displayName}
                            </p>
                            <p className="text-[10px] text-slate-400 truncate">@{other.username}</p>
                          </div>
                        </div>
                        <div
                          className={`w-4 h-4 rounded-md border flex items-center justify-center transition ${
                            isSelected
                              ? 'bg-indigo-600 border-indigo-600 text-white'
                              : 'border-slate-300'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={handleAddMembersSubmit}
                  disabled={addingMembers || selectedToAdd.length === 0}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl disabled:opacity-40 transition flex items-center justify-center space-x-1"
                >
                  {addingMembers && <Loader2 className="w-3 h-3 animate-spin" />}
                  <span>Add ({selectedToAdd.length})</span>
                </button>
              </div>
            )}

            {/* Member List */}
            <div className="space-y-1 divide-y divide-slate-100">
              {members.map((mem) => {
                const isMe = mem.user.id === user?.id;
                const canRemove =
                  isOwnerOrAdmin &&
                  !isMe &&
                  mem.role !== 'OWNER' &&
                  (currentMember?.role === 'OWNER' || mem.role === 'MEMBER');

                return (
                  <div key={mem.id} className="flex items-center justify-between py-2.5">
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                        {mem.user.displayName[0]?.toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-1.5">
                          <p className="text-sm font-semibold text-slate-900 truncate">
                            {mem.user.displayName} {isMe && '(You)'}
                          </p>
                        </div>
                        <p className="text-xs text-slate-400 truncate">@{mem.user.username}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      {mem.role === 'OWNER' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          Owner
                        </span>
                      )}
                      {mem.role === 'ADMIN' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          Admin
                        </span>
                      )}
                      {canRemove && (
                        <button
                          onClick={() => handleRemoveMember(mem.user.id, mem.user.displayName)}
                          disabled={removingMemberId === mem.user.id}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                          title="Remove member"
                        >
                          {removingMemberId === mem.user.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-red-600" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Leave Group Action */}
          <div className="pt-2">
            <button
              onClick={handleLeaveGroup}
              disabled={leaving}
              className="w-full py-3 px-4 rounded-2xl bg-red-50 hover:bg-red-100 text-red-600 font-semibold text-sm transition flex items-center justify-center space-x-2"
            >
              {leaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <LogOut className="w-4 h-4" />
              )}
              <span>Leave Group</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
