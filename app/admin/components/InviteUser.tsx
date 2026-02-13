'use client';

import { useState, useEffect } from 'react';
import { getUser } from '../../../lib/auth';
import { createUserViaEdge, fetchVenues, type Venue } from '../../../lib/api/guests';

export default function InviteUser() {
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    password: '',
    role: 'dj' as 'venue_admin' | 'door' | 'dj',
    guest_limit: 10,
    venue_id: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [venues, setVenues] = useState<Venue[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const user = getUser();
    setCurrentUser(user);

    // Set default venue_id from current user
    if (user?.venue_id) {
      setFormData(prev => ({ ...prev, venue_id: user.venue_id as string }));
    }

    // Super admin can choose venue
    if (user?.role === 'super_admin') {
      fetchVenues().then(({ data }) => {
        if (data) setVenues(data);
      });
    }
  }, []);

  const isSuperAdmin = currentUser?.role === 'super_admin';

  // Role options depend on caller role
  const roleOptions = isSuperAdmin
    ? [
        { value: 'venue_admin', label: 'VENUE ADMIN' },
        { value: 'door', label: 'DOOR STAFF' },
        { value: 'dj', label: 'DJ' },
      ]
    : [
        { value: 'door', label: 'DOOR STAFF' },
        { value: 'dj', label: 'DJ' },
      ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    if (formData.password.length < 6) {
      setError('비밀번호는 최소 6자 이상이어야 합니다.');
      setIsLoading(false);
      return;
    }

    if (!formData.venue_id) {
      setError('베뉴를 선택해주세요.');
      setIsLoading(false);
      return;
    }

    try {
      const { data, error: createError } = await createUserViaEdge({
        email: formData.email,
        password: formData.password,
        name: formData.name,
        role: formData.role,
        venueId: formData.venue_id,
        guestLimit: formData.guest_limit,
      });

      if (createError) {
        setError(createError.message || '사용자 생성에 실패했습니다.');
      } else {
        setSuccess(`${formData.name} (${formData.email}) 계정이 생성되었습니다.`);
        setFormData(prev => ({
          ...prev,
          email: '',
          name: '',
          password: '',
          role: 'dj',
          guest_limit: 10,
        }));
      }
    } catch (err: any) {
      setError(err.message || '사용자 생성 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-900 border border-gray-700 p-4 sm:p-5">
        <h2 className="font-mono text-lg tracking-wider text-white uppercase mb-4">
          CREATE NEW USER
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSuperAdmin && venues.length > 0 && (
            <div>
              <label className="block text-gray-400 font-mono text-xs tracking-wider uppercase mb-2">
                VENUE
              </label>
              <div className="relative">
                <select
                  value={formData.venue_id}
                  onChange={(e) => setFormData({ ...formData, venue_id: e.target.value })}
                  className="w-full appearance-none bg-black border border-gray-700 px-4 py-3 pr-10 text-white font-mono text-sm tracking-wider focus:outline-none focus:border-white"
                  required
                >
                  <option value="">SELECT VENUE</option>
                  {venues.map((venue) => (
                    <option key={venue.id} value={venue.id}>
                      {venue.name} ({venue.type})
                    </option>
                  ))}
                </select>
                <i className="ri-arrow-down-s-line absolute right-3 top-1/2 -translate-y-1/2 text-base text-gray-400 pointer-events-none"></i>
              </div>
            </div>
          )}

          <div>
            <label className="block text-gray-400 font-mono text-xs tracking-wider uppercase mb-2">
              EMAIL ADDRESS
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full bg-black border border-gray-700 px-4 py-3 text-white font-mono text-sm tracking-wider focus:outline-none focus:border-white"
              placeholder="user@example.com"
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
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-black border border-gray-700 px-4 py-3 text-white font-mono text-sm tracking-wider focus:outline-none focus:border-white"
              placeholder="John Doe"
              required
            />
          </div>

          <div>
            <label className="block text-gray-400 font-mono text-xs tracking-wider uppercase mb-2">
              PASSWORD
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full bg-black border border-gray-700 px-4 py-3 text-white font-mono text-sm tracking-wider focus:outline-none focus:border-white"
              placeholder="Minimum 6 characters"
              minLength={6}
              required
            />
          </div>

          <div>
            <label className="block text-gray-400 font-mono text-xs tracking-wider uppercase mb-2">
              ROLE
            </label>
            <div className={`grid grid-cols-${roleOptions.length} gap-2`}>
              {roleOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, role: opt.value as any })}
                  className={`p-3 border font-mono text-xs tracking-wider uppercase transition-colors ${
                    formData.role === opt.value
                      ? 'bg-white text-black border-white'
                      : 'bg-black text-gray-400 border-gray-700 hover:text-white hover:border-gray-500'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {formData.role === 'dj' && (
            <div>
              <label className="block text-gray-400 font-mono text-xs tracking-wider uppercase mb-2">
                GUEST LIMIT
              </label>
              <input
                type="number"
                value={formData.guest_limit}
                onChange={(e) => setFormData({ ...formData, guest_limit: parseInt(e.target.value) || 1 })}
                className="w-full bg-black border border-gray-700 px-4 py-3 text-white font-mono text-sm tracking-wider focus:outline-none focus:border-white"
                min="1"
                required
              />
            </div>
          )}

          {error && (
            <div className="bg-red-900/30 border border-red-700 p-3">
              <p className="text-red-400 font-mono text-xs tracking-wider">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-900/30 border border-green-700 p-4">
              <p className="text-green-400 font-mono text-xs tracking-wider uppercase mb-1">
                USER CREATED SUCCESSFULLY
              </p>
              <p className="text-green-300 font-mono text-xs tracking-wider">{success}</p>
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
                <span>CREATING...</span>
              </div>
            ) : (
              'CREATE USER'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
