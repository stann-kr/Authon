
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import AdminHeader from '../admin/components/AdminHeader';
import AuthGuard from '../../components/AuthGuard';
import GuestListCard from '../../components/GuestListCard';
import { getUser } from '../../lib/auth';
import {
  fetchGuestsByDate,
  fetchDJsByVenue,
  updateGuestStatus,
  deleteGuest,
  type Guest,
  type DJ,
} from '../../lib/api/guests';

export default function DoorPage() {
  return (
    <AuthGuard requiredAccess={['door']}>
      <DoorPageContent />
    </AuthGuard>
  );
}

function DoorPageContent() {
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [selectedDJ, setSelectedDJ] = useState<string>('all');
  const [loadingStates, setLoadingStates] = useState<{ [key: string]: boolean }>({});
  const [isDJDropdownOpen, setIsDJDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [djs, setDJs] = useState<DJ[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [venues, setVenues] = useState<any[]>([]);
  const [selectedVenueId, setSelectedVenueId] = useState<string>('');

  const user = getUser();
  const isSuperAdmin = user?.role === 'super_admin';
  const venueId = isSuperAdmin ? selectedVenueId : user?.venue_id;

  // Load venues for super_admin
  useEffect(() => {
    if (isSuperAdmin) {
      import('../../lib/api/guests').then(({ fetchVenues }) => {
        fetchVenues().then(({ data }) => {
          if (data) {
            setVenues(data);
            if (data.length > 0 && !selectedVenueId) {
              setSelectedVenueId(data[0].id);
            }
          }
        });
      });
    }
  }, [isSuperAdmin]);

  const loadData = useCallback(async () => {
    if (!venueId) return;
    setIsFetching(true);
    try {
      const [guestRes, djRes] = await Promise.all([
        fetchGuestsByDate(selectedDate, venueId),
        fetchDJsByVenue(venueId),
      ]);
      if (guestRes.data) setGuests(guestRes.data);
      if (djRes.data) setDJs(djRes.data);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setIsFetching(false);
    }
  }, [selectedDate, venueId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

    const { data, error } = newStatus === 'deleted'
      ? await deleteGuest(id)
      : await updateGuestStatus(id, newStatus);

    if (!error && data) {
      setGuests(prev => prev.map(g => g.id === id ? data : g));
    } else {
      console.error('Failed to update guest status:', error);
    }

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
          <div className="mb-6 flex flex-col sm:flex-row gap-4">
            {isSuperAdmin && (
              <div className="bg-gray-900 border border-gray-700 p-4 sm:p-5 flex-1">
                <div className="mb-2">
                  <h3 className="font-mono text-xs sm:text-sm tracking-wider text-gray-400 uppercase">SELECT VENUE</h3>
                </div>
                <select
                  value={selectedVenueId}
                  onChange={(e) => setSelectedVenueId(e.target.value)}
                  className="w-full bg-black border border-gray-600 px-4 py-3 text-white font-mono text-sm tracking-wider focus:outline-none focus:border-white"
                >
                  <option value="">-- Select Venue --</option>
                  {venues.map((v) => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="bg-gray-900 border border-gray-700 p-4 sm:p-5 flex-1">
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
                    {isFetching ? '...' : pendingGuests.length + checkedGuests.length}
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
                <div className="border-b border-gray-700 p-4 flex items-center justify-between">
                  <h3 className="font-mono text-xs sm:text-sm tracking-wider text-white uppercase">
                    GUEST LIST ({filteredGuests.length})
                  </h3>
                  <button
                    onClick={loadData}
                    className="px-3 py-1 bg-gray-800 text-gray-400 font-mono text-xs tracking-wider uppercase hover:text-white transition-colors border border-gray-700"
                  >
                    <i className="ri-refresh-line mr-1"></i>REFRESH
                  </button>
                </div>

                {isFetching ? (
                  <div className="flex items-center justify-center p-8">
                    <div className="w-6 h-6 border border-white border-t-transparent rounded-full animate-spin"></div>
                    <span className="ml-2 text-white font-mono text-sm">LOADING...</span>
                  </div>
                ) : filteredGuests.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="w-16 h-16 border border-gray-600 mx-auto mb-4 flex items-center justify-center">
                      <i className="ri-user-line text-gray-400 text-2xl"></i>
                    </div>
                    <p className="text-gray-400 font-mono text-sm tracking-wider uppercase">
                      NO GUESTS FOR THIS DATE
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-700 lg:[max-height:calc(100vh-320px)] lg:overflow-y-auto">
                    {filteredGuests.map((guest, index) => {
                      const guestDJ = djs.find(dj => dj.id === guest.djId);
                      return (
                        <GuestListCard
                          key={guest.id}
                          guest={{
                            id: guest.id,
                            name: guest.name,
                            status: guest.status,
                            checkInTime: guest.checkInTime || undefined,
                            djId: guest.djId || undefined,
                          }}
                          index={index}
                          variant="admin"
                          djName={selectedDJ === 'all' && guestDJ ? guestDJ.name : undefined}
                          onCheck={() => handleStatusChange(guest.id, 'checked', 'check')}
                          onDelete={() => handleStatusChange(guest.id, 'deleted', 'remove')}
                          isCheckLoading={loadingStates[`${guest.id}_check`]}
                          isDeleteLoading={loadingStates[`${guest.id}_remove`]}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
