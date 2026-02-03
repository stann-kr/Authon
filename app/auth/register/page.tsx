'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    requestedRole: 'DJ',
    message: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      setIsLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('비밀번호는 최소 6자 이상이어야 합니다.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          name: formData.name,
          requestedRole: formData.requestedRole,
          message: formData.message
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
      } else {
        setError(data.message || '회원가입에 실패했습니다.');
      }
    } catch (error) {
      setError('회원가입 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="mb-8">
            <div className="w-16 h-16 border-2 border-white rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="ri-check-line text-white text-2xl"></i>
            </div>
            <h1 className="font-mono text-xl tracking-wider text-white uppercase mb-2">
              APPLICATION SUBMITTED
            </h1>
            <p className="text-gray-400 font-mono text-xs tracking-wider">
              회원가입 신청이 완료되었습니다.<br/>
              관리자 승인 후 로그인이 가능합니다.
            </p>
          </div>
          
          <Link 
            href="/auth/login"
            className="inline-block w-full bg-white text-black py-3 font-mono text-sm tracking-wider uppercase hover:bg-gray-200 transition-colors text-center"
          >
            로그인 페이지로 이동
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-2 h-2 bg-white"></div>
            <div className="w-2 h-2 bg-white"></div>
            <div className="w-2 h-2 bg-white"></div>
          </div>
          <h1 className="font-mono text-2xl tracking-wider text-white uppercase mb-2">JOIN Authon</h1>
          <p className="text-xs text-gray-400 tracking-widest font-mono uppercase">STAFF APPLICATION</p>
        </div>

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-400 font-mono text-xs tracking-wider uppercase mb-2">
              EMAIL ADDRESS
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="w-full bg-gray-900 border border-gray-700 px-4 py-3 text-white font-mono text-sm tracking-wider focus:outline-none focus:border-white"
              placeholder="Enter your email"
              required
            />
          </div>

          <div>
            <label className="block text-gray-400 font-mono text-xs tracking-wider uppercase mb-2">
              FULL NAME
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full bg-gray-900 border border-gray-700 px-4 py-3 text-white font-mono text-sm tracking-wider focus:outline-none focus:border-white"
              placeholder="Enter your full name"
              required
            />
          </div>

          <div>
            <label className="block text-gray-400 font-mono text-xs tracking-wider uppercase mb-2">
              REQUESTED ROLE
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormData({...formData, requestedRole: 'DJ'})}
                className={`p-3 border font-mono text-xs tracking-wider uppercase transition-colors ${
                  formData.requestedRole === 'DJ'
                    ? 'bg-white text-black border-white'
                    : 'bg-gray-900 text-gray-400 border-gray-700 hover:text-white hover:border-gray-500'
                }`}
              >
                DJ (STAFF)
              </button>
              <button
                type="button"
                onClick={() => setFormData({...formData, requestedRole: 'Door'})}
                className={`p-3 border font-mono text-xs tracking-wider uppercase transition-colors ${
                  formData.requestedRole === 'Door'
                    ? 'bg-white text-black border-white'
                    : 'bg-gray-900 text-gray-400 border-gray-700 hover:text-white hover:border-gray-500'
                }`}
              >
                DOOR
              </button>
            </div>
          </div>

          <div>
            <label className="block text-gray-400 font-mono text-xs tracking-wider uppercase mb-2">
              PASSWORD
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              className="w-full bg-gray-900 border border-gray-700 px-4 py-3 text-white font-mono text-sm tracking-wider focus:outline-none focus:border-white"
              placeholder="Enter password (min 6 chars)"
              required
              minLength={6}
            />
          </div>

          <div>
            <label className="block text-gray-400 font-mono text-xs tracking-wider uppercase mb-2">
              CONFIRM PASSWORD
            </label>
            <input
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
              className="w-full bg-gray-900 border border-gray-700 px-4 py-3 text-white font-mono text-sm tracking-wider focus:outline-none focus:border-white"
              placeholder="Confirm your password"
              required
            />
          </div>

          <div>
            <label className="block text-gray-400 font-mono text-xs tracking-wider uppercase mb-2">
              MESSAGE (OPTIONAL)
            </label>
            <textarea
              value={formData.message}
              onChange={(e) => setFormData({...formData, message: e.target.value})}
              className="w-full bg-gray-900 border border-gray-700 px-4 py-3 text-white font-mono text-sm tracking-wider focus:outline-none focus:border-white resize-none"
              placeholder="Tell us about yourself..."
              rows={3}
              maxLength={500}
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
            disabled={isLoading}
            className="w-full bg-white text-black py-3 font-mono text-sm tracking-wider uppercase hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border border-black border-t-transparent rounded-full animate-spin"></div>
                <span>SUBMITTING...</span>
              </div>
            ) : (
              'SUBMIT APPLICATION'
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-6 text-center">
          <Link 
            href="/auth/login"
            className="text-gray-500 font-mono text-xs tracking-wider hover:text-white transition-colors"
          >
            Already have an account? SIGN IN
          </Link>
        </div>

        <div className="mt-6 text-center">
          <p className="text-gray-600 font-mono text-xs tracking-wider">
            © 2025 Authon
          </p>
        </div>
      </div>
    </div>
  );
}