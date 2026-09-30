import Link from 'next/link';
import { ArrowRight, MessageSquare, ShieldCheck, Zap } from 'lucide-react';

export default function SplashPage() {
  return (
    <main className="flex-1 flex flex-col justify-between p-6 bg-gradient-to-b from-white via-blue-50/30 to-slate-50">
      {/* Top Brand Mark */}
      <div className="pt-12 text-center flex flex-col items-center">
        <div className="w-20 h-20 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-3xl flex items-center justify-center shadow-lg shadow-blue-500/25 mb-4 ring-8 ring-blue-50">
          <MessageSquare className="w-10 h-10 text-white fill-white/20" />
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Chitro</h1>
        <p className="text-sm font-medium text-slate-500 mt-1">Conversations that matter</p>
      </div>

      {/* Hero Illustration / Value Props */}
      <div className="my-auto py-8 space-y-4">
        <div className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-start space-x-3.5">
          <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center shrink-0 text-blue-600">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Instant Real-Time Chat</h2>
            <p className="text-xs text-slate-500 mt-0.5">Reliable 1-on-1 direct conversations and coordinated group chats.</p>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-start space-x-3.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0 text-emerald-600">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Verified & Secure</h2>
            <p className="text-xs text-slate-500 mt-0.5">Email OTP verification with cryptographic digests and robust access control.</p>
          </div>
        </div>
      </div>

      {/* Call to Actions */}
      <div className="space-y-3 pb-6">
        <Link
          href="/register"
          className="w-full flex items-center justify-center space-x-2 py-3.5 px-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-semibold rounded-2xl shadow-md shadow-blue-600/20 transition duration-150"
        >
          <span>Get Started</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
        <Link
          href="/login"
          className="w-full flex items-center justify-center py-3.5 px-4 bg-white hover:bg-slate-50 active:scale-[0.99] text-slate-700 font-semibold rounded-2xl border border-slate-200 shadow-sm transition duration-150"
        >
          Sign In
        </Link>
        <p className="text-center text-[11px] text-slate-400 pt-2">
          V1.0 • Simple Today. More Tomorrow.
        </p>
      </div>
    </main>
  );
}
