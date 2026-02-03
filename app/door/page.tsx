
'use client';

import { useState, useRef, useEffect } from 'react';
import AdminHeader from '../admin/components/AdminHeader';
import AuthGuard from '../../components/AuthGuard';

interface Guest {
  id: string;
  name: string;
  djId: string;
  status: 'pending' | 'checked' | 'deleted';
  checkInTime?: string;
}

interface DJ {
  id: string;
  name: string;
  event: string;
}

export default function DoorPage() {
  return (
    <AuthGuard requiredAccess={['door']}>
      <DoorPageContent />
    </AuthGuard>
  );
}

function DoorPageContent() {
  const [selectedDate, setSelectedDate] = useState('2025-08-30');
  const [selectedDJ, setSelectedDJ] = useState<string>('all');
  const [loadingStates, setLoadingStates] = useState<{ [key: string]: boolean }>({});
  const [isDJDropdownOpen, setIsDJDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [djs] = useState<DJ[]>([
    { id: '1', name: 'STANN LUMO', event: 'INVITES' },
    { id: '2', name: 'JOHN DOE', event: 'MIDNIGHT SESSIONS' },
    { id: '3', name: 'KATE MOON', event: 'DEEP HOUSE NIGHT' },
    { id: '4', name: 'ALEX JONES', event: 'TECHNO PARADISE' },
    { id: '5', name: 'SARA KIM', event: 'ELECTRONIC VIBES' }
  ]);

  const [guests, setGuests] = useState<Guest[]>([
    { id: '1', name: 'KIM MINSU', djId: '1', status: 'pending' },
    { id: '2', name: 'LEE YOUNGHEE', djId: '1', status: 'checked', checkInTime: '19:30' },
    { id: '3', name: 'PARK JUNHO', djId: '2', status: 'pending' },
    { id: '4', name: 'CHOI SEOYEON', djId: '2', status: 'checked', checkInTime: '20:15' },
    { id: '5', name: 'JUNG DAEUN', djId: '3', status: 'pending' },
    { id: '6', name: 'WANG MINHO', djId: '3', status: 'checked', checkInTime: '21:00' },
    { id: '7', name: 'SONG JIHYE', djId: '4', status: 'pending' },
    { id: '8', name: 'KIM TAEHYUN', djId: '5', status: 'pending' },
    { id: '1', name: 'KIM MINSU', djId: '1', status: 'pending' },
    { id: '2', name: 'LEE YOUNGHEE', djId: '1', status: 'checked', checkInTime: '19:30' },
    { id: '3', name: 'PARK JUNHO', djId: '2', status: 'pending' },
    { id: '4', name: 'CHOI SEOYEON', djId: '2', status: 'checked', checkInTime: '20:15' },
    { id: '5', name: 'JUNG DAEUN', djId: '3', status: 'pending' },
    { id: '6', name: 'WANG MINHO', djId: '3', status: 'checked', checkInTime: '21:00' },
    { id: '7', name: 'SONG JIHYE', djId: '4', status: 'pending' },
    { id: '8', name: 'KIM TAEHYUN', djId: '5', status: 'pending' }
  ]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDJDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatDateDisplay = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
  };

  const handleStatusChange = async (id: string, newStatus: Guest['status'], action: string) => {
    setLoadingStates(prev => ({ ...prev, [`${id}_${action}`]: true }));
    await new Promise(resolve => setTimeout(resolve, 100));

    setGuests(prev => prev.map(guest =>
      guest.id === id
        ? { ...guest, status: newStatus, checkInTime: newStatus === 'checked' ? new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : undefined }
        : guest
    ));

    setLoadingStates(prev => ({ ...prev, [`${id}_${action}`]: false }));
  };

  const filteredGuests = selectedDJ === 'all'
    ? guests
    : guests.filter(guest => guest.djId === selectedDJ);

  const pendingGuests = filteredGuests.filter(guest => guest.status === 'pending');
  const checkedGuests = filteredGuests.filter(guest => guest.status === 'checked');

  const getSelectedDJInfo = () => {
    if (selectedDJ === 'all') return { name: 'ALL DJS', event: 'TOTAL OVERVIEW' };
    return djs.find(dj => dj.id === selectedDJ) || { name: '', event: '' };
  };

  const selectedDJInfo = getSelectedDJInfo();

  const getSelectedDJName = () => {
    if (selectedDJ === 'all') return 'SELECT DJ';
    const dj = djs.find(d => d.id === selectedDJ);
    return dj ? dj.name : 'SELECT DJ';
  };

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
                  <h3 className="font-mono text-xs sm:text-sm tracking-wider text-gray-400 uppercase mb-3">SELECT DJ</h3>
                  <div className="space-y-2">
                    <button
                      onClick={() => setSelectedDJ('all')}
                      className={`w-full p-3 font-mono text-xs tracking-wider uppercase transition-colors ${
                        selectedDJ === 'all'
                          ? 'bg-white text-black'
                          : 'bg-gray-800 text-gray-400 hover:text-white border border-gray-700'
                      }`}
                    >
                      ALL DJS
                    </button>
                    
                    <div className="relative" ref={dropdownRef}>
                      <button
                        onClick={() => setIsDJDropdownOpen(!isDJDropdownOpen)}
                        className={`w-full bg-gray-800 border border-gray-700 p-3 font-mono text-xs tracking-wider uppercase focus:outline-none focus:border-white flex items-center justify-between transition-colors ${
                          selectedDJ !== 'all' ? 'text-white' : 'text-gray-400'
                        }`}
                      >
                        <span>{getSelectedDJName()}</span>
                        <i className={`ri-arrow-down-s-line text-base transition-transform ${isDJDropdownOpen ? 'rotate-180' : ''}`}></i>
                      </button>
                      
                      {isDJDropdownOpen && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-gray-900 border border-gray-700 z-50 max-h-60 overflow-y-auto">
                          {djs.map((dj) => (
                            <button
                              key={dj.id}
                              onClick={() => {
                                setSelectedDJ(dj.id);
                                setIsDJDropdownOpen(false);
                              }}
                              className={`w-full p-3 font-mono text-xs tracking-wider uppercase text-left transition-colors ${
                                selectedDJ === dj.id
                                  ? 'bg-white text-black'
                                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                              }`}
                            >
                              <div>{dj.name}</div>
                              <div className="text-[10px] mt-1 opacity-60">{dj.event}</div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-900 border border-gray-700 p-4 sm:p-5">
                <div className="mb-4">
                  <h2 className="font-mono text-base sm:text-lg tracking-wider text-white uppercase mb-1">
                    {selectedDJInfo.name}
                  </h2>
                  <p className="text-gray-400 font-mono text-xs tracking-wider mb-1">
                    {selectedDJInfo.event}
                  </p>
                  <p className="text-gray-400 font-mono text-xs tracking-wider">
                    {formatDateDisplay(selectedDate)}
                  </p>
                </div>
                <div className="text-center mb-4">
                  <div className="text-white font-mono text-3xl sm:text-4xl tracking-wider">
                    {pendingGuests.length + checkedGuests.length}
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
                  {filteredGuests.map((guest, index) => {
                    const guestDJ = djs.find(dj => dj.id === guest.djId);
                    return (
                      <div key={guest.id} className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 sm:gap-4">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 border border-gray-600 flex items-center justify-center">
                              <span className="text-xs sm:text-sm font-mono text-gray-400">
                                {String(index + 1).padStart(2, '0')}
                              </span>
                            </div>
                            <div>
                              <p className="font-mono text-sm sm:text-base tracking-wider text-white uppercase">
                                {guest.name}
                              </p>
                              <div className="flex flex-wrap gap-2 mt-1">
                                {selectedDJ === 'all' && guestDJ && (
                                  <span className="text-xs font-mono text-gray-400">
                                    DJ: {guestDJ.name}
                                  </span>
                                )}
                                {guest.checkInTime && (
                                  <span className="text-xs font-mono text-green-400">
                                    IN: {guest.checkInTime}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            {guest.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleStatusChange(guest.id, 'checked', 'check')}
                                  disabled={loadingStates[`${guest.id}_check`]}
                                  className="px-4 sm:px-6 py-2 sm:py-3 bg-white text-black font-mono text-xs tracking-wider uppercase hover:bg-gray-200 transition-colors disabled:opacity-50"
                                >
                                  {loadingStates[`${guest.id}_check`] ? (
                                    <div className="flex items-center justify-center">
                                      <div className="w-3 h-3 border border-black border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                  ) : (
                                    'CHECK'
                                  )}
                                </button>
                                <button
                                  onClick={() => handleStatusChange(guest.id, 'deleted', 'remove')}
                                  disabled={loadingStates[`${guest.id}_remove`]}
                                  className="px-3 sm:px-4 py-2 sm:py-3 border border-gray-600 text-gray-400 font-mono text-xs tracking-wider uppercase hover:bg-gray-800 transition-colors disabled:opacity-50"
                                >
                                  {loadingStates[`${guest.id}_remove`] ? (
                                    <div className="flex items-center justify-center">
                                      <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                  ) : (
                                    <i className="ri-close-line"></i>
                                  )}
                                </button>
                              </>
                            )}

                            {guest.status === 'checked' && (
                              <div className="flex items-center gap-2">
                                <span className="px-4 sm:px-6 py-2 sm:py-3 bg-green-600/20 border border-green-600 text-green-400 font-mono text-xs tracking-wider uppercase">
                                  ACTIVE
                                </span>
                                <button
                                  onClick={() => handleStatusChange(guest.id, 'deleted', 'remove')}
                                  disabled={loadingStates[`${guest.id}_remove`]}
                                  className="w-8 h-8 sm:w-10 sm:h-10 border border-gray-600 flex items-center justify-center text-gray-400 hover:bg-gray-800 transition-colors disabled:opacity-50"
                                >
                                  {loadingStates[`${guest.id}_remove`] ? (
                                    <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                                  ) : (
                                    <i className="ri-close-line text-sm"></i>
                                  )}
                                </button>
                              </div>
                            )}

                            {guest.status === 'deleted' && (
                              <span className="px-4 sm:px-6 py-2 sm:py-3 bg-gray-800 text-gray-500 font-mono text-xs tracking-wider uppercase">
                                REMOVED
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
