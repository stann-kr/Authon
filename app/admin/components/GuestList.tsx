
'use client';

import { useState } from 'react';
import GuestListCard from '../../../components/GuestListCard';

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

interface GuestListProps {
  selectedDate: string;
}

export default function GuestList({ selectedDate }: GuestListProps) {
  const [selectedDJ, setSelectedDJ] = useState<string>('all');
  const [loadingStates, setLoadingStates] = useState<{[key: string]: boolean}>({});
  
  const [djs] = useState<DJ[]>([
    { id: '1', name: 'STANN LUMO', event: 'INVITES: KERRIE' },
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
    { id: '8', name: 'KIM TAEHYUN', djId: '5', status: 'pending' }
  ]);

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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
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

  return (
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
              <select
                value={selectedDJ === 'all' ? '' : selectedDJ}
                onChange={(e) => setSelectedDJ(e.target.value || 'all')}
                className="w-full bg-gray-800 border border-gray-700 px-4 py-4 text-white font-mono text-sm tracking-wider uppercase focus:outline-none focus:border-white min-h-[52px]"
              >
                <option value="">SELECT DJ</option>
                {djs.map((dj) => (
                  <option key={dj.id} value={dj.id} className="bg-gray-900">
                    {dj.name}
                  </option>
                ))}
              </select>
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
              {formatDate(selectedDate)}
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
                <GuestListCard
                  key={guest.id}
                  guest={guest}
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
        </div>
      </div>
    </div>
  );
}
