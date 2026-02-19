
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Footer from '@/components/Footer';
import Spinner from '@/components/Spinner';
import Alert from '@/components/Alert';
import { BRAND_NAME } from '@/lib/brand';
import { createClient } from '@/lib/supabase/client';

export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [isInvite, setIsInvite] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const checkSession = async () => {
      setError('');

      try {
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        const queryParams = new URLSearchParams(window.location.search);
        const flowType = hashParams.get('type') || queryParams.get('type');
        setIsInvite(flowType === 'invite');

        // Prevent collision with existing local session (e.g., admin already logged in).
        await supabase.auth.signOut({ scope: 'local' });

        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        if (accessToken && refreshToken) {
          const { error: setSessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (!setSessionError) {
            setIsValid(true);
            return;
          }
        }

        const tokenHash = hashParams.get('token_hash') || queryParams.get('token_hash');
        if (tokenHash && (flowType === 'invite' || flowType === 'recovery')) {
          const { error: verifyError } = await supabase.auth.verifyOtp({
            type: flowType,
            token_hash: tokenHash,
          });

          if (!verifyError) {
            setIsValid(true);
            return;
          }
        }

        const { data: { session } } = await supabase.auth.getSession();
        setIsValid(!!session);
      } catch (err) {
        console.error('Failed to validate reset-password session:', err);
        setIsValid(false);
        setError('Failed to verify this link. Please request password reset again.');
      } finally {
        setIsValidating(false);
      }
    };

    checkSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        setError('Failed to change password: ' + updateError.message);
      } else {
        // Activate user account after successful password setup (for invited users)
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await (supabase as any)
            .from('users')
            .update({ active: true })
            .eq('auth_user_id', user.id);
        }

        // Sign out after password change
        await supabase.auth.signOut();
        setSuccess(true);
        setTimeout(() => {
          router.push('/auth/login');
        }, 3000);
      }
    } catch (err) {
      setError('An error occurred while changing password.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isValidating) {
    return <Spinner mode="fullscreen" text="VERIFYING..." />;
  }

  if (success) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 border border-green-500 flex items-center justify-center mx-auto mb-6">
            <i className="ri-check-line text-green-500 text-3xl"></i>
          </div>
          <h2 className="font-mono text-xl tracking-wider text-white uppercase mb-2">
            PASSWORD CHANGED
          </h2>
          <p className="text-gray-400 font-mono text-xs tracking-wider mb-6">
            Your password has been changed. Redirecting to login...
          </p>
        </div>
      </div>
    );
  }

  if (!isValid) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 border border-red-500 flex items-center justify-center mx-auto mb-6">
            <i className="ri-close-line text-red-500 text-3xl"></i>
          </div>
          <h2 className="font-mono text-xl tracking-wider text-white uppercase mb-2">
            INVALID LINK
          </h2>
          <p className="text-gray-400 font-mono text-xs tracking-wider mb-6">
            {error || 'This link is invalid or expired. Please request password reset again.'}
          </p>
          <button
            onClick={() => router.push('/auth/login')}
            className="bg-white text-black px-6 py-3 font-mono text-xs tracking-wider uppercase hover:bg-gray-200 transition-colors"
          >
            GO TO LOGIN
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-sm sm:max-w-md">
        <div className="bg-gray-900/50 border border-gray-800 p-6 sm:p-8 lg:p-10">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-2 h-2 bg-white"></div>
              <div className="w-2 h-2 bg-white"></div>
              <div className="w-2 h-2 bg-white"></div>
            </div>
            <h1 className="font-mono text-xl sm:text-2xl lg:text-3xl tracking-wider text-white uppercase mb-2">{BRAND_NAME}</h1>
            <p className="text-xs sm:text-sm text-gray-400 tracking-widest font-mono uppercase">
              {isInvite ? 'SET YOUR PASSWORD' : 'SET NEW PASSWORD'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            <div>
              <label className="block text-gray-400 font-mono text-xs sm:text-sm tracking-wider uppercase mb-2">
                NEW PASSWORD
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 px-4 py-3 sm:py-4 text-white font-mono text-sm tracking-wider focus:outline-none focus:border-white transition-colors"
                placeholder="Minimum 6 characters"
                required
                minLength={6}
              />
            </div>

            <div>
              <label className="block text-gray-400 font-mono text-xs sm:text-sm tracking-wider uppercase mb-2">
                CONFIRM PASSWORD
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 px-4 py-3 sm:py-4 text-white font-mono text-sm tracking-wider focus:outline-none focus:border-white transition-colors"
                placeholder="Confirm your password"
                required
                minLength={6}
              />
            </div>

            {error && (
              <Alert type="error" message={error} />
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-white text-black py-3 sm:py-4 font-mono text-sm tracking-wider uppercase hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border border-black border-t-transparent rounded-full animate-spin"></div>
                  <span>CHANGING...</span>
                </div>
              ) : (
                'CHANGE PASSWORD'
              )}
            </button>
          </form>

          <Footer compact />
        </div>
      </div>
    </div>
  );
}
