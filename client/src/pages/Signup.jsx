import React, { useState } from 'react';
import { signupUser } from '../services/api';
import { IconAlertCircle, IconChevronRight } from '../components/ui/Icons';

export const Signup = ({ onSignupSuccess, onNavigateToLogin, onNavigateToHome }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide your name.');
      return;
    }
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError('Please provide a valid email address.');
      return;
    }
    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await signupUser({ name, email, password });
      if (res && res.user) {
        onSignupSuccess(res.user, res.defaultProject);
      }
    } catch (err) {
      setError(err.message || 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-[#111111] flex flex-col justify-center items-center px-6 selection:bg-[#E5E5E5] selection:text-[#111111]">
      <div className="w-full max-w-sm">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-8">
          <div 
            onClick={onNavigateToHome}
            className="w-10 h-10 rounded bg-[#111111] flex items-center justify-center text-white font-mono font-bold text-lg cursor-pointer hover:bg-neutral-800 transition-colors mb-3"
            title="Return to Public Site"
          >
            T
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-[#111111]">
            Create a TraceBack account
          </h1>
          <p className="text-xs text-[#666666] mt-1 text-center">
            Start monitoring errors in your Node.js applications
          </p>
        </div>

        {/* Error notification */}
        {error && (
          <div className="mb-4 p-3 rounded bg-[#FEF2F2] border border-[#FEE2E2] flex items-start gap-2.5 text-xs text-[#991B1B]">
            <IconAlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#DC2626]" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {/* Signup Form */}
        <div className="bg-[#F7F7F7] border border-[#E5E5E5] rounded-md p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#111111] mb-1.5">
                Full name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ada Lovelace"
                required
                disabled={loading}
                className="w-full px-3 py-2 text-xs bg-white border border-[#E5E5E5] rounded text-[#111111] placeholder-[#888888] focus:outline-none focus:border-[#111111] transition-colors disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#111111] mb-1.5">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="developer@company.com"
                required
                disabled={loading}
                className="w-full px-3 py-2 text-xs bg-white border border-[#E5E5E5] rounded text-[#111111] placeholder-[#888888] focus:outline-none focus:border-[#111111] transition-colors disabled:opacity-60"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-[#111111]">
                  Password
                </label>
                <span className="text-[10px] text-[#888888]">Minimum 8 characters</span>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={loading}
                className="w-full px-3 py-2 text-xs bg-white border border-[#E5E5E5] rounded text-[#111111] placeholder-[#888888] focus:outline-none focus:border-[#111111] transition-colors disabled:opacity-60"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-[#111111] text-white text-xs font-medium rounded hover:bg-neutral-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <span>{loading ? 'Creating workspace...' : 'Get Started Free'}</span>
              {!loading && <IconChevronRight className="w-3.5 h-3.5" />}
            </button>
          </form>
        </div>

        {/* Navigation Switchers */}
        <div className="mt-6 text-center space-y-2 text-xs text-[#666666]">
          <div>
            Already have an account?{' '}
            <button
              onClick={onNavigateToLogin}
              className="text-[#111111] font-medium hover:underline"
            >
              Sign in
            </button>
          </div>

          <div>
            <button
              onClick={onNavigateToHome}
              className="text-[#888888] hover:text-[#111111] transition-colors"
            >
              ← Back to public homepage
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
