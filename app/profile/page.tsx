
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Footer from '@/components/Footer';
import { getUser, User } from '@/lib/auth';
import { createClient } from '@/lib/supabase/client';
import { updateUserProfile } from '@/lib/api/guests';

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const currentUser = getUser();
    if (!currentUser) {
      router.push('/auth/login');
      return;
    }
    setUser(currentUser);
    setFormData(prev => ({ ...prev, name: currentUser.name }));
    setIsLoading(false);
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSaving(true);

    if (formData.newPassword) {
      if (formData.newPassword.length < 6) {
        setError('새 비밀번호는 최소 6자 이상이어야 합니다.');
        setIsSaving(false);
        return;
      }
      if (formData.newPassword !== formData.confirmPassword) {
        setError('새 비밀번호가 일치하지 않습니다.');
        setIsSaving(false);
        return;
      }
      if (!formData.currentPassword) {
        setError('현재 비밀번호를 입력해주세요.');
        setIsSaving(false);
        return;
      }
    }

    try {
      // 1. 비밀번호 변경이 요청된 경우 현재 비밀번호 검증 후 변경
      if (formData.newPassword) {
        // 현재 비밀번호로 재인증
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: user!.email,
          password: formData.currentPassword,
        });

        if (signInError) {
          setError('현재 비밀번호가 올바르지 않습니다.');
          setIsSaving(false);
          return;
        }

        // 새 비밀번호로 업데이트
        const { error: updateError } = await supabase.auth.updateUser({
          password: formData.newPassword,
        });

        if (updateError) {
          setError('비밀번호 변경에 실패했습니다: ' + updateError.message);
          setIsSaving(false);
          return;
        }
      }

      // 2. 이름 변경 — DB에 저장
      if (user && formData.name !== user.name) {
        const { error: nameError } = await updateUserProfile(user.id, { name: formData.name });

        if (nameError) {
          setError('이름 변경에 실패했습니다: ' + nameError.message);
          setIsSaving(false);
          return;
        }
      }

      const updatedUser = {
        ...user,
        name: formData.name
      };
      
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser as User);
      
      setShowSuccess(true);
      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
      
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      setError('저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white font-mono text-sm tracking-wider uppercase">LOADING...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-black">
      <div className="fixed top-0 left-0 right-0 z-50 bg-black border-b border-gray-800">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-10">
          <div className="flex items-center justify-between h-16 sm:h-20">
            <div className="flex items-center gap-4">
              <Link href="/" className="w-8 h-8 sm:w-10 sm:h-10 border border-gray-600 bg-black hover:bg-gray-900 transition-colors flex items-center justify-center">
                <i className="ri-arrow-left-line text-gray-400 text-sm sm:text-base"></i>
              </Link>
              <div>
                <h1 className="font-mono text-base sm:text-lg tracking-wider text-white uppercase">PROFILE</h1>
                <p className="text-xs text-gray-500 font-mono tracking-wider uppercase hidden sm:block">EDIT YOUR INFORMATION</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto pt-20 sm:pt-24 pb-6">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-gray-900 border border-gray-700 p-4 sm:p-5">
                <div className="flex flex-col items-center text-center">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 border border-gray-600 bg-black flex items-center justify-center mb-4">
                    <i className="ri-user-line text-gray-400 text-3xl sm:text-4xl"></i>
                  </div>
                  <h2 className="font-mono text-base sm:text-lg tracking-wider text-white uppercase mb-1">
                    {user.name}
                  </h2>
                  <p className="text-gray-400 font-mono text-xs tracking-wider mb-3">
                    {user.email}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-black border border-gray-600 text-xs font-mono text-gray-300 uppercase">
                      {user.role}
                    </span>
                    <span className="px-2 py-1 bg-black border border-gray-600 text-xs font-mono text-gray-300">
                      LIMIT: {user.guest_limit}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-900 border border-gray-700 p-4 sm:p-5">
                <h3 className="font-mono text-xs sm:text-sm tracking-wider text-gray-400 uppercase mb-3">ACCOUNT INFO</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 font-mono text-xs uppercase">Role</span>
                    <span className="text-white font-mono text-xs uppercase">{user.role}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 font-mono text-xs uppercase">Guest Limit</span>
                    <span className="text-white font-mono text-xs">{user.guest_limit}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 font-mono text-xs uppercase">Status</span>
                    <span className="text-green-400 font-mono text-xs uppercase">ACTIVE</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-3">
              {showSuccess && (
                <div className="bg-green-900/30 border border-green-600 p-4 mb-6">
                  <div className="flex items-center gap-3">
                    <i className="ri-check-line text-green-500"></i>
                    <p className="text-green-400 font-mono text-sm tracking-wider uppercase">
                      프로필이 저장되었습니다.
                    </p>
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-900/30 border border-red-600 p-4 mb-6">
                  <div className="flex items-center gap-3">
                    <i className="ri-error-warning-line text-red-500"></i>
                    <p className="text-red-400 font-mono text-sm tracking-wider">
                      {error}
                    </p>
                  </div>
                </div>
              )}

              <div className="bg-gray-900 border border-gray-700">
                <div className="border-b border-gray-700 p-4">
                  <h3 className="font-mono text-xs sm:text-sm tracking-wider text-white uppercase">
                    EDIT PROFILE
                  </h3>
                </div>

                <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6">
                  <div>
                    <label className="block text-xs sm:text-sm text-gray-400 font-mono tracking-wider uppercase mb-2">
                      NAME
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-black border border-gray-600 px-4 py-3 text-white font-mono text-sm tracking-wider uppercase focus:outline-none focus:border-white transition-colors"
                      required
                    />
                  </div>

                  <div className="border-t border-gray-700 pt-6">
                    <p className="text-xs sm:text-sm text-gray-400 font-mono tracking-wider uppercase mb-4">
                      CHANGE PASSWORD (OPTIONAL)
                    </p>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs sm:text-sm text-gray-400 font-mono tracking-wider uppercase mb-2">
                          CURRENT PASSWORD
                        </label>
                        <input
                          type="password"
                          value={formData.currentPassword}
                          onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                          className="w-full bg-black border border-gray-600 px-4 py-3 text-white font-mono text-sm tracking-wider focus:outline-none focus:border-white transition-colors"
                          placeholder="••••••••"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs sm:text-sm text-gray-400 font-mono tracking-wider uppercase mb-2">
                            NEW PASSWORD
                          </label>
                          <input
                            type="password"
                            value={formData.newPassword}
                            onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                            className="w-full bg-black border border-gray-600 px-4 py-3 text-white font-mono text-sm tracking-wider focus:outline-none focus:border-white transition-colors"
                            placeholder="••••••••"
                          />
                        </div>

                        <div>
                          <label className="block text-xs sm:text-sm text-gray-400 font-mono tracking-wider uppercase mb-2">
                            CONFIRM PASSWORD
                          </label>
                          <input
                            type="password"
                            value={formData.confirmPassword}
                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                            className="w-full bg-black border border-gray-600 px-4 py-3 text-white font-mono text-sm tracking-wider focus:outline-none focus:border-white transition-colors"
                            placeholder="••••••••"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSaving}
                    className="w-full bg-white text-black font-mono text-sm tracking-wider uppercase py-3 sm:py-4 hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSaving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                        SAVING...
                      </>
                    ) : (
                      <>
                        <i className="ri-save-line"></i>
                        SAVE CHANGES
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>

        <Footer />
      </div>
    </div>
  );
}
