'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Mail, AtSign, LogOut, Loader2, CheckCircle2, Edit3, Check, X, FileText,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api';

export default function ProfilePage() {
  const { user, isLoading, logout, refreshUser } = useAuth();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [form, setForm] = useState({ displayName: '', bio: '' });

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
    if (user) {
      setForm({ displayName: user.displayName || '', bio: user.bio || '' });
    }
  }, [user, isLoading, router]);

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
  };

  const startEdit = () => {
    setForm({ displayName: user?.displayName || '', bio: user?.bio || '' });
    setSaveError(null);
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setSaveError(null);
  };

  const saveProfile = async () => {
    const trimmedName = form.displayName.trim();
    if (!trimmedName || trimmedName.length < 2) {
      setSaveError('Display name must be at least 2 characters');
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      await apiClient('/users/me', {
        method: 'PATCH',
        body: JSON.stringify({ displayName: trimmedName, bio: form.bio.trim() }),
      });
      await refreshUser();
      setEditing(false);
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading || !user) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  const avatarLetter = user.displayName?.[0]?.toUpperCase() || user.username?.[0]?.toUpperCase() || '?';

  return (
    <div className="flex-1 flex flex-col bg-slate-50 overflow-y-auto">
      {/* Hero */}
      <div className="bg-gradient-to-b from-blue-600 to-blue-500 px-6 pt-14 pb-10 text-center relative">
        {/* Edit button */}
        {!editing ? (
          <button
            onClick={startEdit}
            className="absolute top-14 right-5 w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center text-white hover:bg-white/30 transition"
            title="Edit Profile"
          >
            <Edit3 className="w-4 h-4" />
          </button>
        ) : (
          <div className="absolute top-14 right-5 flex space-x-1.5">
            <button
              onClick={cancelEdit}
              className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center text-white hover:bg-white/30 transition"
              title="Cancel"
            >
              <X className="w-4 h-4" />
            </button>
            <button
              onClick={saveProfile}
              disabled={saving}
              className="w-8 h-8 bg-white rounded-xl flex items-center justify-center text-blue-600 hover:bg-blue-50 transition disabled:opacity-60"
              title="Save"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            </button>
          </div>
        )}

        {/* Avatar */}
        <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-3xl flex items-center justify-center text-white font-bold text-3xl mx-auto mb-4 ring-4 ring-white/30">
          {avatarLetter}
        </div>

        {/* Display name — editable */}
        {editing ? (
          <input
            value={form.displayName}
            onChange={(e) => setForm({ ...form, displayName: e.target.value })}
            maxLength={40}
            className="w-full max-w-[220px] mx-auto block bg-white/20 text-white placeholder:text-white/60 text-center text-xl font-bold rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-white/50 border border-white/30"
            placeholder="Display name"
          />
        ) : (
          <h1 className="text-white font-bold text-xl tracking-tight">{user.displayName}</h1>
        )}

        <p className="text-blue-100 text-sm mt-1">@{user.username}</p>

        {user.isVerified && (
          <div className="mt-2 inline-flex items-center space-x-1 bg-white/20 rounded-full px-3 py-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-white" />
            <span className="text-white text-xs font-medium">Verified</span>
          </div>
        )}
      </div>

      {/* Info Cards */}
      <div className="px-4 py-4 space-y-2">
        {/* Error */}
        {saveError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600">
            {saveError}
          </div>
        )}

        {/* Account Info */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
          <div className="flex items-center space-x-3 px-4 py-3.5 border-b border-slate-50">
            <Mail className="w-4 h-4 text-slate-400 shrink-0" />
            <div>
              <p className="text-[11px] text-slate-400 font-medium">Email</p>
              <p className="text-sm text-slate-900 font-medium">{user.email}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3 px-4 py-3.5">
            <AtSign className="w-4 h-4 text-slate-400 shrink-0" />
            <div>
              <p className="text-[11px] text-slate-400 font-medium">Username</p>
              <p className="text-sm text-slate-900 font-medium">@{user.username}</p>
            </div>
          </div>
        </div>

        {/* Bio — editable */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
          <div className="flex items-start space-x-3 px-4 py-3.5">
            <FileText className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-slate-400 font-medium mb-1">About</p>
              {editing ? (
                <textarea
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  maxLength={200}
                  rows={3}
                  className="w-full text-sm text-slate-900 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition placeholder:text-slate-400"
                  placeholder="Write something about yourself..."
                />
              ) : (
                <p className="text-sm text-slate-700 leading-relaxed">
                  {user.bio || <span className="text-slate-400 italic">No bio yet</span>}
                </p>
              )}
              {editing && (
                <p className="text-[10px] text-slate-400 text-right mt-1">{form.bio.length}/200</p>
              )}
            </div>
          </div>
        </div>

        {/* Save button (mobile) */}
        {editing && (
          <button
            onClick={saveProfile}
            disabled={saving}
            className="w-full py-3.5 bg-blue-600 text-white font-semibold rounded-2xl flex items-center justify-center space-x-2 hover:bg-blue-700 transition shadow-md shadow-blue-600/20 disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            <span>Save Changes</span>
          </button>
        )}

        {/* Sign out */}
        {!editing && (
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full bg-white rounded-2xl border border-red-100 px-4 py-3.5 flex items-center space-x-3 text-red-500 hover:bg-red-50 transition shadow-sm disabled:opacity-60"
          >
            {loggingOut
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <LogOut className="w-4 h-4 shrink-0" />
            }
            <span className="text-sm font-semibold">Sign Out</span>
          </button>
        )}
      </div>
    </div>
  );
}
