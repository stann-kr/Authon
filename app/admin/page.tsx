
'use client';

import { useState } from 'react';
import AdminHeader from './components/AdminHeader';
import GuestList from './components/GuestList';
import LinkManagement from './components/LinkManagement';
import UserManagement from './components/UserManagement';
import AuthGuard from '../../components/AuthGuard';

export default function AdminPage() {
  return (
    <AuthGuard requiredAccess={['admin']}>
      <AdminPageContent />
    </AuthGuard>
  );
}

function AdminPageContent() {
  const [activeTab, setActiveTab] = useState('guests');
  const [selectedDate, setSelectedDate] = useState('2025-08-30');

  const tabs = [
    { id: 'guests', label: 'GUEST', icon: 'ri-group-line' },
    { id: 'links', label: 'LINKS', icon: 'ri-link' },
    { id: 'users', label: 'USERS', icon: 'ri-user-settings-line' }
  ];

  const formatDateDisplay = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-black">
      <AdminHeader />
      
      <div className="pt-20 sm:pt-24 pb-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <div className="grid grid-cols-3 gap-px bg-gray-700">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`p-3 sm:p-4 font-mono text-xs sm:text-sm tracking-wider uppercase transition-colors ${
                    activeTab === tab.id
                      ? 'bg-white text-black'
                      : 'bg-gray-900 text-gray-400 hover:text-white'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2">
                    <i className={`${tab.icon} text-sm sm:text-base`}></i>
                    <span className="text-xs">{tab.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {(activeTab === 'guests' || activeTab === 'links') && (
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
          )}

          <div>
            {activeTab === 'guests' && <GuestList selectedDate={selectedDate} />}
            {activeTab === 'links' && <LinkManagement selectedDate={selectedDate} />}
            {activeTab === 'users' && <UserManagement />}
          </div>
        </div>
      </div>
    </div>
  );
}
