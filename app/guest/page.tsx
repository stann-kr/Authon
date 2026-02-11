
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import AdminHeader from '../admin/components/AdminHeader';
import AuthGuard from '../../components/AuthGuard';
import {
  fetchGuestsByDate,
  createGuest,
  deleteGuest,
  validateExternalToken,
  createGuestViaExternalLink,
  type Guest,
  type ExternalDJLink,
  type Venue,
} from '../../lib/api/guests';
import { getUser } from '../../lib/auth';

export default function GuestPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <GuestPageRouter />
    </Suspense>
  );
}

/**
 * Router: if ?token= is present, render external DJ flow (no auth needed).
 * Otherwise, render the authenticated DJ flow.
 */
function GuestPageRouter() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  if (token) {
    return <ExternalDJGuestPage token={token} />;
  }

  return (
    <AuthGuard requiredAccess={['guest']}>
      <AuthenticatedGuestPage />
    </AuthGuard>
  );
}

// ============================================================
// External DJ Guest Page (token-based, no auth)
// ============================================================

function ExternalDJGuestPage({ token }: { token: string }) {
  const [linkInfo, setLinkInfo] = useState<ExternalDJLink | null>(null);
  const [venueInfo, setVenueInfo] = useState<Venue | null>(null);
  const [isValidating, setIsValidating] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [guestName, setGuestName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guests, setGuests] = useState<Guest[]>([]);

  useEffect(() => {
    const validate = async () => {
      setIsValidating(true);
      const { data, error } = await validateExternalToken(token);
      if (error) {
        setValidationError(typeof error === 'string' ? error : error.message || '유효하지 않은 링크입니다.');
      } else if (data) {
        setLinkInfo(data.link);
        setVenueInfo(data.venue);
      }
      setIsValidating(false);
    };
    validate();
  }, [token]);

  const handleSave = async () => {
    if (!guestName.trim() || !linkInfo) return;
    setIsLoading(true);
    setError(null);

    const { data, error: createError } = await createGuestViaExternalLink({
      token,
      guestName: guestName.trim().toUpperCase(),
      date: linkInfo.date,
    });

    if (createError) {
      setError(typeof createError === 'string' ? createError : createError.message || '게스트 등록에 실패했습니다.');
    } else if (data) {
      setGuests(prev => [data, ...prev]);
      setGuestName('');
      // Update used count locally
      setLinkInfo(prev => prev ? { ...prev, usedGuests: prev.usedGuests + 1 } : prev);
    }
    setIsLoading(false);
  };

  const formatDateDisplay = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
  };

  if (isValidating) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white font-mono text-sm tracking-wider">VALIDATING LINK...</p>
        </div>
      </div>
    );
  }

  if (validationError) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 border-2 border-red-600 mx-auto mb-4 flex items-center justify-center">
            <i className="ri-error-warning-line text-red-400 text-2xl"></i>
          </div>
          <h1 className="font-mono text-xl tracking-wider text-white uppercase mb-2">INVALID LINK</h1>
          <p className="text-gray-400 font-mono text-xs tracking-wider mb-6">{validationError}</p>
          <p className="text-gray-600 font-mono text-xs">© 2025 Authon</p>
        </div>
      </div>
    );
  }

  const remaining = linkInfo ? linkInfo.maxGuests - linkInfo.usedGuests : 0;
  const isAtLimit = remaining <= 0;

  return (
    <div className="min-h-screen bg-black">
      {/* Minimal header for external DJs */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-black border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-white"></div>
            <span className="font-mono text-sm tracking-wider text-white uppercase">Authon</span>
          </div>
          <span className="font-mono text-xs tracking-wider text-gray-400 uppercase">
            GUEST ACCESS
          </span>
        </div>
      </div>

      <div className="pt-16 sm:pt-20 pb-4">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-gray-900 border border-gray-700 p-4 sm:p-5">
                <div className="mb-4">
                  <h2 className="font-mono text-base sm:text-lg tracking-wider text-white uppercase mb-1">
                    {linkInfo?.djName}
                  </h2>
                  <p className="text-gray-400 font-mono text-xs tracking-wider mb-1">
                    {linkInfo?.event}
                  </p>
                  {venueInfo && (
                    <p className="text-gray-500 font-mono text-xs tracking-wider mb-1">
                      {venueInfo.name}
                    </p>
                  )}
                  <p className="text-gray-400 font-mono text-xs tracking-wider">
                    {linkInfo ? formatDateDisplay(linkInfo.date) : ''}
                  </p>
                </div>
                <div className="text-center mb-4">
                  <div className="text-white font-mono text-3xl sm:text-4xl tracking-wider">
                    {guests.length}
                  </div>
                  <div className="text-gray-400 text-xs font-mono tracking-wider uppercase">
                    REGISTERED
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-px bg-gray-700">
                  <div className="bg-gray-800 p-3 text-center">
                    <div className="text-green-400 font-mono text-lg sm:text-xl tracking-wider">
                      {remaining}
                    </div>
                    <div className="text-gray-400 text-xs font-mono tracking-wider uppercase">
                      REMAINING
                    </div>
                  </div>
                  <div className="bg-gray-800 p-3 text-center">
                    <div className="text-white font-mono text-lg sm:text-xl tracking-wider">
                      {linkInfo?.maxGuests}
                    </div>
                    <div className="text-gray-400 text-xs font-mono tracking-wider uppercase">
                      MAX
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-3">
              {error && (
                <div className="mb-4 bg-red-900/20 border border-red-600 p-4 text-center">
                  <p className="text-red-400 font-mono text-sm tracking-wider">{error}</p>
                </div>
              )}

              <div className="bg-gray-900 border border-gray-700">
                <div className="border-b border-gray-700 p-4">
                  <h3 className="font-mono text-xs sm:text-sm tracking-wider text-white uppercase">
                    GUEST LIST ({guests.length})
                  </h3>
                </div>

                <div className="divide-y divide-gray-700 lg:[max-height:calc(100vh-320px)] lg:overflow-y-auto">
                  {guests.map((guest, index) => (
                    <div key={guest.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 sm:gap-4">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 border border-gray-600 flex items-center justify-center">
                            <span className="text-xs sm:text-sm font-mono text-gray-400">
                              {String(index + 1).padStart(2, '0')}
                            </span>
                          </div>
                          <span className="font-mono text-sm sm:text-base tracking-wider text-white uppercase">
                            {guest.name}
                          </span>
                        </div>
                        <span className="px-4 py-2 bg-green-600/20 border border-green-600 text-green-400 font-mono text-xs tracking-wider uppercase">
                          REGISTERED
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {!isAtLimit && (
                  <div className="p-4 border-t-2 border-gray-600">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 border border-gray-600 flex items-center justify-center">
                        <span className="text-xs sm:text-sm font-mono text-gray-400">
                          {String(guests.length + 1).padStart(2, '0')}
                        </span>
                      </div>

                      <input
                        type="text"
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        placeholder="Enter guest full name"
                        className="flex-1 bg-transparent border-none outline-none text-white font-mono text-sm tracking-wider placeholder-gray-400"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') handleSave();
                        }}
                      />

                      <button
                        onClick={handleSave}
                        disabled={!guestName.trim() || isLoading}
                        className="px-4 sm:px-6 py-2 sm:py-3 bg-white text-black font-mono text-xs tracking-wider uppercase hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isLoading ? (
                          <div className="w-3 h-3 border border-black border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          'SAVE'
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {isAtLimit && (
                  <div className="p-4 border-t-2 border-gray-600 text-center">
                    <p className="text-yellow-400 font-mono text-xs tracking-wider uppercase">
                      GUEST LIMIT REACHED ({linkInfo?.maxGuests}/{linkInfo?.maxGuests})
                    </p>
                  </div>
                )}
              </div>

              {guests.length === 0 && (
                <div className="bg-gray-900 border border-gray-700 text-center py-12 mt-4">
                  <div className="w-16 h-16 border border-gray-600 mx-auto mb-4 flex items-center justify-center">
                    <i className="ri-user-add-line text-gray-400 text-2xl"></i>
                  </div>
                  <p className="text-gray-400 font-mono text-sm tracking-wider uppercase">
                    ADD YOUR GUESTS ABOVE
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Authenticated Guest Page (existing DJ flow)
// ============================================================

function AuthenticatedGuestPage() {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [guestName, setGuestName] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isFetching, setIsFetching] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [guests, setGuests] = useState<Guest[]>([]);

  useEffect(() => {
    const loadGuests = async () => {
      setIsFetching(true);
      setError(null);
      
      const user = getUser();
      const { data, error: fetchError } = await fetchGuestsByDate(selectedDate, user?.venue_id);
      
      if (fetchError) {
        console.error('Failed to fetch guests:', fetchError);
        setError('게스트 정보를 불러오는데 실패했습니다.');
      } else if (data) {
        setGuests(data);
      }
      
      setIsFetching(false);
    };

    loadGuests();
  }, [selectedDate]);

  const formatDateDisplay = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
  };

  const handleSave = async () => {
    if (!guestName.trim()) return;

    const user = getUser();
    if (!user || !user.venue_id) {
        console.error('No venue ID found for user');
        setError('로그인 정보가 올바르지 않습니다.');
        return;
    }

    setIsLoading(true);
    setError(null);

    const { data, error: createError } = await createGuest({
      venueId: user.venue_id,
      name: guestName.trim().toUpperCase(),
      date: selectedDate,
      status: 'pending',
    });

    if (createError) {
      console.error('Failed to create guest:', createError);
      setError('게스트 등록에 실패했습니다.');
      setIsLoading(false);
      return;
    }

    if (data) {
      setGuests(prev => [data, ...prev]);
      setGuestName('');
    }

    setIsLoading(false);
  };

  const handleDelete = async (id: string) => {
    setIsLoading(true);
    setError(null);

    const { data, error: deleteError } = await deleteGuest(id);

    if (deleteError) {
      console.error('Failed to delete guest:', deleteError);
      setError('게스트 삭제에 실패했습니다.');
      setIsLoading(false);
      return;
    }

    if (data) {
      setGuests(prev => prev.map(guest => 
        guest.id === id ? data : guest
      ));
    }

    setIsLoading(false);
  };

  const filteredGuests = guests.filter(guest => guest.date === selectedDate);
  const pendingGuests = filteredGuests.filter(guest => guest.status === 'pending');
  const checkedGuests = filteredGuests.filter(guest => guest.status === 'checked');

  return (
    <div className="min-h-screen bg-black">
      <AdminHeader />

      <div className="pt-20 sm:pt-24 pb-4">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <div className="bg-gray-900 border border-gray-700 p-4 sm:p-5">
              <div className="mb-2">
                <h3 className="font-mono text-xs sm:text-sm tracking-wider text-gray-400 uppercase">SELECT DATE</h3>
              </div>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full sm:w-auto sm:min-w-[250px] bg-black border border-gray-600 px-4 py-3 text-white font-mono text-sm tracking-wider focus:outline-none focus:border-white"
              />
            </div>
          </div>

          {error && (
            <div className="mb-6 bg-red-900/20 border border-red-600 p-4 text-center">
              <p className="text-red-400 font-mono text-sm tracking-wider">{error}</p>
            </div>
          )}

          {isFetching && (
            <div className="mb-6 text-center">
              <div className="inline-block w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-gray-900 border border-gray-700 p-4 sm:p-5">
                <div className="mb-4">
                  <h2 className="font-mono text-base sm:text-lg tracking-wider text-white uppercase mb-1">
                    GUEST REGISTRATION
                  </h2>
                  <p className="text-gray-400 font-mono text-xs tracking-wider mb-1">
                    SELF SERVICE PORTAL
                  </p>
                  <p className="text-gray-400 font-mono text-xs tracking-wider">
                    {formatDateDisplay(selectedDate)}
                  </p>
                </div>
                <div className="text-center mb-4">
                  <div className="text-white font-mono text-3xl sm:text-4xl tracking-wider">
                    {filteredGuests.length}
                  </div>
                  <div className="text-gray-400 text-xs font-mono tracking-wider uppercase">
                    TOTAL GUESTS
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-px bg-gray-700">
                  <div className="bg-gray-800 p-3 text-center">
                    <div className="text-white font-mono text-lg sm:text-xl tracking-wider">
                      {pendingGuests.length}
                    </div>
                    <div className="text-gray-400 text-xs font-mono tracking-wider uppercase">
                      WAITING
                    </div>
                  </div>
                  <div className="bg-gray-800 p-3 text-center">
                    <div className="text-white font-mono text-lg sm:text-xl tracking-wider">
                      {checkedGuests.length}
                    </div>
                    <div className="text-gray-400 text-xs font-mono tracking-wider uppercase">
                      CHECKED
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-3">
              <div className="bg-gray-900 border border-gray-700">
                <div className="border-b border-gray-700 p-4">
                  <h3 className="font-mono text-xs sm:text-sm tracking-wider text-white uppercase">
                    GUEST LIST ({filteredGuests.length})
                  </h3>
                </div>

                <div className="divide-y divide-gray-700 lg:[max-height:calc(100vh-320px)] lg:overflow-y-auto">
                  {filteredGuests.map((guest, index) => (
                    <div key={guest.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 sm:gap-4">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 border border-gray-600 flex items-center justify-center">
                            <span className="text-xs sm:text-sm font-mono text-gray-400">
                              {String(index + 1).padStart(2, '0')}
                            </span>
                          </div>
                          <span className="font-mono text-sm sm:text-base tracking-wider text-white uppercase">
                            {guest.name}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {guest.status === 'pending' && (
                            <button
                              onClick={() => handleDelete(guest.id)}
                              disabled={isLoading}
                              className="px-3 sm:px-4 py-2 sm:py-3 bg-red-600 text-white font-mono text-xs tracking-wider uppercase hover:bg-red-700 transition-colors disabled:opacity-50"
                            >
                              {isLoading ? (
                                <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                              ) : (
                                'DELETE'
                              )}
                            </button>
                          )}

                          {guest.status === 'checked' && (
                            <span className="px-4 sm:px-6 py-2 sm:py-3 bg-green-600/20 border border-green-600 text-green-400 font-mono text-xs tracking-wider uppercase">
                              ACTIVE
                            </span>
                          )}

                          {guest.status === 'deleted' && (
                            <span className="px-4 sm:px-6 py-2 sm:py-3 bg-gray-800 text-gray-500 font-mono text-xs tracking-wider uppercase">
                              REMOVED
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-4 border-t-2 border-gray-600">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 border border-gray-600 flex items-center justify-center">
                      <span className="text-xs sm:text-sm font-mono text-gray-400">
                        {String(filteredGuests.length + 1).padStart(2, '0')}
                      </span>
                    </div>

                    <input
                      type="text"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="Enter guest full name"
                      className="flex-1 bg-transparent border-none outline-none text-white font-mono text-sm tracking-wider placeholder-gray-400"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleSave();
                        }
                      }}
                    />

                    <button
                      onClick={handleSave}
                      disabled={!guestName.trim() || isLoading}
                      className="px-4 sm:px-6 py-2 sm:py-3 bg-white text-black font-mono text-xs tracking-wider uppercase hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <div className="w-3 h-3 border border-black border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        'SAVE'
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {filteredGuests.length === 0 && (
                <div className="bg-gray-900 border border-gray-700 text-center py-12 mt-4">
                  <div className="w-16 h-16 border border-gray-600 mx-auto mb-4 flex items-center justify-center">
                    <i className="ri-user-add-line text-gray-400 text-2xl"></i>
                  </div>
                  <p className="text-gray-400 font-mono text-sm tracking-wider uppercase">
                    No guests registered for this date
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
