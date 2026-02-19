'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BRAND_FOOTER, BRAND_NAME } from '@/lib/brand';

interface InviteData {
  email: string;
  name: string;
  role: string;
  guest_limit: number;
}

interface InvitePageClientProps {
  inviteId: string;
}

export default function InvitePageClient({ inviteId }: InvitePageClientProps) {
  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!inviteId || typeof inviteId !== 'string') {
      setError('유효하지 않은 초대 ID입니다.');
      setIsLoading(false);
      return;
    }
    loadInviteData();
  }, [inviteId]);

  const loadInviteData = async () => {
    try {
      const invitesData = localStorage.getItem('admin_invites');
      if (!invitesData) {
        setError('초대 정보를 찾을 수 없습니다.');
        setIsLoading(false);
        return;
      }

      const invites = JSON.parse(invitesData);
      const invite = invites.find((inv: any) => inv.id === inviteId);

      if (!invite) {
        setError('유효하지 않은 초대 링크입니다.');
      } else if (invite.used) {
        setError('초대 링크가 만료되었거나 이미 사용되었습니다.');
      } else {
        setInviteData(invite);
      }
    } catch (error) {
      console.error('Error loading invite data:', error);
      setError('초대 정보를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setError('');

    if (!password || !confirmPassword) {
      setError('비밀번호를 입력해주세요.');
      return;
    }

    if (password.length < 6) {
      setError('비밀번호는 최소 6자 이상이어야 합니다.');
      return;
    }

    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    if (!inviteId) {
      setError('유효하지 않은 초대 ID입니다.');
      return;
    }

    setIsSubmitting(true);

    try {
      const invitesData = localStorage.getItem('admin_invites');
      const usersData = localStorage.getItem('users');
      
      if (!invitesData || !inviteData) {
        throw new Error('초대 정보를 찾을 수 없습니다.');
      }

      const invites = JSON.parse(invitesData);
      const users = usersData ? JSON.parse(usersData) : [];

      const inviteIndex = invites.findIndex((inv: any) => inv.id === inviteId);
      if (inviteIndex === -1) {
        throw new Error('초대 정보를 찾을 수 없습니다.');
      }

      const newUser = {
        id: Date.now().toString(),
        email: inviteData.email,
        password: password,
        name: inviteData.name,
        role: inviteData.role,
        guest_limit: inviteData.guest_limit,
        created_at: new Date().toISOString()
      };

      users.push(newUser);
      invites[inviteIndex].used = true;

      localStorage.setItem('users', JSON.stringify(users));
      localStorage.setItem('admin_invites', JSON.stringify(invites));

      setSuccess(true);
      setTimeout(() => {
        router.push('/auth/login');
      }, 2000);
    } catch (error) {
      console.error('Error creating account:', error);
      setError('계정 생성 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border border-white border-t-transparent rounded-full animate-spin"></div>
          <span className="text-white font-mono text-sm tracking-wider uppercase">LOADING...</span>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <i className="ri-check-line text-white text-3xl"></i>
          </div>
          <h2 className="font-mono text-xl tracking-wider text-white uppercase mb-2">
            계정이 생성되었습니다
          </h2>
          <p className="text-gray-400 font-mono text-xs tracking-wider mb-6">
            로그인 페이지로 이동합니다...
          </p>
        </div>
      </div>
    );
  }

  if (error && !inviteData) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <i className="ri-close-line text-white text-3xl"></i>
          </div>
          <h2 className="font-mono text-xl tracking-wider text-white uppercase mb-2">
            유효하지 않은 초대
          </h2>
          <p className="text-gray-400 font-mono text-xs tracking-wider mb-6">
            {error}
          </p>
          <button
            onClick={() => router.push('/auth/login')}
            className="bg-white text-black px-6 py-3 font-mono text-xs tracking-wider uppercase hover:bg-gray-200 transition-colors"
          >
            로그인 페이지로
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-2 h-2 bg-white"></div>
            <div className="w-2 h-2 bg-white"></div>
            <div className="w-2 h-2 bg-white"></div>
          </div>
          <h1 className="font-mono text-2xl tracking-wider text-white uppercase mb-2">{BRAND_NAME}</h1>
          <p className="text-xs text-gray-400 tracking-widest font-mono uppercase">ACCOUNT SETUP</p>
        </div>

        {inviteData && (
          <div className="bg-gray-900 border border-gray-700 p-4 mb-6">
            <p className="text-gray-400 font-mono text-xs tracking-wider uppercase mb-2">
              초대 정보
            </p>
            <div className="space-y-2">
              <div>
                <span className="text-gray-500 font-mono text-xs">이름: </span>
                <span className="text-white font-mono text-xs">{inviteData.name}</span>
              </div>
              <div>
                <span className="text-gray-500 font-mono text-xs">이메일: </span>
                <span className="text-white font-mono text-xs">{inviteData.email}</span>
              </div>
              <div>
                <span className="text-gray-500 font-mono text-xs">역할: </span>
                <span className="text-white font-mono text-xs">{inviteData.role}</span>
              </div>
              <div>
                <span className="text-gray-500 font-mono text-xs">게스트 제한: </span>
                <span className="text-white font-mono text-xs">{inviteData.guest_limit}명</span>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-400 font-mono text-xs tracking-wider uppercase mb-2">
              비밀번호
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 px-4 py-3 text-white font-mono text-sm tracking-wider focus:outline-none focus:border-white"
              placeholder="최소 6자 이상"
              required
              minLength={6}
            />
          </div>

          <div>
            <label className="block text-gray-400 font-mono text-xs tracking-wider uppercase mb-2">
              비밀번호 확인
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 px-4 py-3 text-white font-mono text-sm tracking-wider focus:outline-none focus:border-white"
              placeholder="비밀번호 재입력"
              required
              minLength={6}
            />
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-700 p-3">
              <p className="text-red-400 font-mono text-xs tracking-wider">
                {error}
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-white text-black py-3 font-mono text-sm tracking-wider uppercase hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border border-black border-t-transparent rounded-full animate-spin"></div>
                <span>생성 중...</span>
              </div>
            ) : (
              '계정 생성'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600 font-mono text-xs tracking-wider">
            {BRAND_FOOTER}
          </p>
        </div>
      </div>
    </div>
  );
}
