
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '@/lib/auth';

export default function LoginPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const result = await login(formData.email, formData.password);
      
      if (result.success) {
        router.push('/');
      } else {
        setError(result.message || '로그인에 실패했습니다.');
      }
    } catch (error) {
      setError('로그인 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

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
            <h1 className="font-mono text-xl sm:text-2xl lg:text-3xl tracking-wider text-white uppercase mb-2">Authon</h1>
            <p className="text-xs sm:text-sm text-gray-400 tracking-widest font-mono uppercase">USER ACCESS</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            <div>
              <label className="block text-gray-400 font-mono text-xs sm:text-sm tracking-wider uppercase mb-2">
                EMAIL ADDRESS
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full bg-gray-900 border border-gray-700 px-4 py-3 sm:py-4 text-white font-mono text-sm tracking-wider focus:outline-none focus:border-white transition-colors"
                placeholder="Enter your email"
                required
              />
            </div>

            <div>
              <label className="block text-gray-400 font-mono text-xs sm:text-sm tracking-wider uppercase mb-2">
                PASSWORD
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                className="w-full bg-gray-900 border border-gray-700 px-4 py-3 sm:py-4 text-white font-mono text-sm tracking-wider focus:outline-none focus:border-white transition-colors"
                placeholder="Enter your password"
                required
              />
            </div>

            {error && (
              <div className="bg-red-900/30 border border-red-700 p-3 sm:p-4">
                <p className="text-red-400 font-mono text-xs sm:text-sm tracking-wider">
                  {error}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-white text-black py-3 sm:py-4 font-mono text-sm tracking-wider uppercase hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border border-black border-t-transparent rounded-full animate-spin"></div>
                  <span>SIGNING IN...</span>
                </div>
              ) : (
                'SIGN IN'
              )}
            </button>
          </form>

          <div className="mt-6 sm:mt-8 text-center">
            <p className="text-gray-600 font-mono text-xs tracking-wider">
              © 2025 Authon
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
