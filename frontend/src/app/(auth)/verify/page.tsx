'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Mail, CheckCircle2, AlertCircle, Loader2, ArrowLeft, RefreshCw } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

function VerifyOtpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get('email') || '';
  const { login } = useAuth();

  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(60);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  useEffect(() => {
    // Focus first input on mount
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1); // Take last char
    setOtp(newOtp);

    // Auto focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto submit if all 6 digits entered
    const combined = newOtp.join('');
    if (combined.length === 6) {
      triggerVerification(combined);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pastedData)) {
      const digits = pastedData.split('');
      setOtp(digits);
      inputRefs.current[5]?.focus();
      triggerVerification(pastedData);
    }
  };

  const triggerVerification = async (codeToVerify?: string) => {
    const code = codeToVerify || otp.join('');
    if (code.length !== 6) {
      setError('Please enter all 6 digits');
      return;
    }

    if (!email) {
      setError('Email address is missing');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await apiClient('/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim().toLowerCase(), code }),
      });

      setSuccess('Account verified successfully!');
      login(res.accessToken, res.refreshToken, res.user);

      setTimeout(() => {
        router.push('/chats');
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || resending || !email) return;

    setError(null);
    setResending(true);

    try {
      await apiClient('/auth/resend-otp', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      setCountdown(60);
      setSuccess('A fresh 6-digit code has been sent to your email.');
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to resend verification code');
    } finally {
      setResending(false);
    }
  };

  const maskedEmail = email
    ? email.replace(/^(.)(.*)(@.*)$/, (_, first, middle, domain) => `${first}${'*'.repeat(Math.min(middle.length, 5))}${domain}`)
    : '';

  return (
    <div className="flex-1 flex flex-col justify-between p-6 bg-gradient-to-b from-white to-slate-50">
      {/* Top navigation */}
      <div>
        <Link
          href="/register"
          className="inline-flex items-center space-x-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 transition py-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </Link>

        <div className="pt-4 text-center flex flex-col items-center">
          <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 mb-4 ring-8 ring-blue-50/50">
            <Mail className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Verify your email</h1>
          <p className="text-xs text-slate-500 mt-1 max-w-xs">
            We sent a 6-digit verification code to <span className="font-semibold text-slate-800">{maskedEmail || 'your email'}</span>
          </p>
        </div>
      </div>

      {/* Main OTP Input */}
      <div className="my-auto py-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 flex items-start space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{success}</span>
          </div>
        )}

        {/* 6-digit cells */}
        <div className="flex justify-between items-center gap-2 mb-6">
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={(el) => {
                inputRefs.current[index] = el;
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              className="w-12 h-14 text-center text-2xl font-bold rounded-xl border border-slate-200 bg-white text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 shadow-sm transition"
            />
          ))}
        </div>

        <button
          onClick={() => triggerVerification()}
          disabled={loading || otp.join('').length !== 6}
          className="w-full flex items-center justify-center space-x-2 py-3.5 px-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-semibold rounded-xl shadow-md shadow-blue-600/20 transition disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>Verify & Continue</span>}
        </button>

        {/* Resend Action */}
        <div className="mt-6 text-center">
          <p className="text-xs text-slate-500">
            Didn&apos;t receive the code?{' '}
            {countdown > 0 ? (
              <span className="text-slate-400 font-medium">Resend in {countdown}s</span>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className="font-semibold text-blue-600 hover:underline inline-flex items-center space-x-1"
              >
                {resending ? (
                  <RefreshCw className="w-3 h-3 animate-spin" />
                ) : (
                  <span>Resend Code</span>
                )}
              </button>
            )}
          </p>
        </div>
      </div>

      {/* Security Note */}
      <div className="pt-4 text-center">
        <p className="text-[11px] text-slate-400">
          Codes expire after 10 minutes. For security, never share your verification code.
        </p>
      </div>
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>}>
      <VerifyOtpContent />
    </Suspense>
  );
}
