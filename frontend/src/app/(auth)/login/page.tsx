'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MessageSquare, ArrowRight, User, Lock, AlertCircle, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    identifier: '',
    password: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await apiClient('/auth/login', {
        method: 'POST',
        body: JSON.stringify(formData),
      });

      if (!res.isVerified) {
        // Account requires OTP verification
        router.push(`/verify?email=${encodeURIComponent(res.email)}`);
        return;
      }

      login(res.accessToken, res.refreshToken, res.user);
      router.push('/chats');
    } catch (err: any) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between p-6 bg-gradient-to-b from-white to-slate-50">
      {/* Header */}
      <div className="pt-8">
        <div className="flex items-center space-x-2 text-blue-600 mb-6">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-sm shadow-blue-500/30">
            <MessageSquare className="w-5 h-5 fill-white/20" />
          </div>
          <span className="font-bold text-lg tracking-tight text-slate-900">Chitro</span>
        </div>

        <h1 className="text-2xl font-bold text-slate-900">Welcome Back</h1>
        <p className="text-sm text-slate-500 mt-1">Sign in to continue conversations</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="my-auto py-6 space-y-4">
        {error && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 flex items-start space-x-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email or Username</label>
          <div className="relative">
            <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              required
              placeholder="you@gmail.com or username"
              value={formData.identifier}
              onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
              className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Password</label>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="password"
              required
              placeholder="Enter your password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 flex items-center justify-center space-x-2 py-3.5 px-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-semibold rounded-xl shadow-md shadow-blue-600/20 transition disabled:opacity-60"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <span>Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Footer */}
      <div className="pt-4 text-center">
        <p className="text-xs text-slate-500">
          Don&apos;t have an account yet?{' '}
          <Link href="/register" className="font-semibold text-blue-600 hover:underline">
            Create Account
          </Link>
        </p>
      </div>
    </div>
  );
}
