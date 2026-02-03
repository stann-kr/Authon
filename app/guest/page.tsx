
'use client';

import { useState } from 'react';
import AdminHeader from '../admin/components/AdminHeader';
import AuthGuard from '../../components/AuthGuard';

export default function GuestPage() {
  return (
    <AuthGuard requiredAccess={['guest']}>
      <GuestPageContent />
    </AuthGuard>
  );
}

function GuestPageContent() {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [guestName, setGuestName] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [guests, setGuests] = useState<Array<{id: string, name: string, status: 'pending' | 'checked' | 'deleted', date: string}>>([
    { id: '1', name: 'test1', status: 'deleted', date: '2025-08-25' },
    { id: '2', name: 'test2', status: 'checked', date: '2025-08-25' },
  ]);

  const formatDateDisplay = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
  };

  const handleSave = async () => {
    if (!guestName.trim()) return;

    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 100));

    const newGuest = {
      id: Date.now().toString(),
      name: guestName,
      status: 'pending' as const,
      date: selectedDate
    };

    setGuests(prev => [newGuest, ...prev]);
    setGuestName('');
    setIsLoading(false);
  };

  const handleDelete = async (id: string) => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 100));

    setGuests(prev => prev.map(guest => 
      guest.id === id ? { ...guest, status: 'deleted' } : guest
    ));

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
                                <div className="flex items-center justify-center">
                                  <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                                </div>
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
                        <div className="flex items-center justify-center">
                          <div className="w-3 h-3 border border-black border-t-transparent rounded-full animate-spin"></div>
                        </div>
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
