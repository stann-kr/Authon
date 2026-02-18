'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

/**
 * Register page is no longer available.
 * User accounts are created by admins (super_admin / venue_admin).
 * This page shows a message and redirects to login after 3 seconds.
 */
export default function RegisterPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/auth/login');
    }, 3000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <div className="mb-8">
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="w-2 h-2 bg-white"></div>
            <div className="w-2 h-2 bg-white"></div>
            <div className="w-2 h-2 bg-white"></div>
          </div>

          <div className="w-16 h-16 border-2 border-gray-600 mx-auto mb-4 flex items-center justify-center">
            <i className="ri-lock-line text-gray-400 text-2xl"></i>
          </div>

          <h1 className="font-mono text-xl tracking-wider text-white uppercase mb-4">
            REGISTRATION CLOSED
          </h1>
          <p className="text-gray-400 font-mono text-xs tracking-wider leading-relaxed">
            회원가입은 관리자를 통해서만 가능합니다.<br />
            계정이 필요하시면 베뉴 관리자에게 문의하세요.
          </p>
        </div>

        <p className="text-gray-600 font-mono text-xs tracking-wider mb-6">
          3초 후 로그인 페이지로 이동합니다...
        </p>
        
        <Link 
          href="/auth/login"
          className="inline-block w-full bg-white text-black py-3 font-mono text-sm tracking-wider uppercase hover:bg-gray-200 transition-colors text-center"
        >
          로그인 페이지로 이동
        </Link>

        <div className="mt-6 text-center">
          <p className="text-gray-600 font-mono text-xs tracking-wider">
            © 2025 Authon By Stann
          </p>
        </div>
      </div>
    </div>
  );
}