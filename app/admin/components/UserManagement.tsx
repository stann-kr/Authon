
'use client';

import { useState, useEffect } from 'react';
import InviteUser from './InviteUser';
import VenueSelector, { useVenueSelector } from '../../../components/VenueSelector';
import StatGrid from '../../../components/StatGrid';
import PanelHeader from '../../../components/PanelHeader';
import Spinner from '../../../components/Spinner';
import RoleLabel from '../../../components/RoleLabel';
import {
  fetchUsersByVenue,
  updateUserProfile,
  deleteUserViaEdge,
  type User,
} from '../../../lib/api/guests';

export default function UserManagement() {
  const [activeTab, setActiveTab] = useState<'create' | 'users'>('create');
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const { venueId, venues, selectedVenueId, setSelectedVenueId, isSuperAdmin, user: currentUser } = useVenueSelector();

  const effectiveVenueId = isSuperAdmin ? selectedVenueId : currentUser?.venue_id;

  useEffect(() => {
    if (activeTab === 'users' && effectiveVenueId) {
      loadUsers();
    }
  }, [activeTab, effectiveVenueId]);

  const loadUsers = async () => {
    if (!effectiveVenueId && !isSuperAdmin) return;
    setIsLoading(true);
    try {
      const { data, error } = await fetchUsersByVenue(isSuperAdmin ? effectiveVenueId || null : effectiveVenueId);
      if (error) {
        console.error('Failed to load users:', error);
      } else if (data) {
        setUsers(data);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserUpdate = async (userId: string, updates: { name?: string; guestLimit?: number; active?: boolean; role?: string }) => {
    try {
      const { error } = await updateUserProfile(userId, updates);
      if (error) {
        console.error('Failed to update user:', error);
        alert('Failed to update user.');
      } else {
        await loadUsers();
      }
    } catch (error) {
      console.error('Failed to update user:', error);
    }
  };

  const handleUserDelete = async (userId: string) => {
    if (!confirm('Delete this user? This action cannot be undone.')) return;
    try {
      const { error } = await deleteUserViaEdge(userId);
      if (error) {
        console.error('Failed to delete user:', error);
        alert('Failed to delete user.');
      } else {
        await loadUsers();
      }
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
  };

  const getTabInfo = () => {
    switch (activeTab) {
      case 'create':
        return { title: 'CREATE USER', description: 'Create new staff accounts' };
      case 'users':
        return { title: 'USER LIST', description: 'Manage existing users' };
      default:
        return { title: '', description: '' };
    }
  };

  const tabInfo = getTabInfo();

  if (isLoading && activeTab === 'users') {
    return <Spinner mode="inline" text="LOADING..." />;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-6">
      <div className="lg:col-span-1 space-y-4">
        {/* Venue selector for super_admin */}
        {isSuperAdmin && venues.length > 0 && (
          <VenueSelector
            venues={venues}
            selectedVenueId={selectedVenueId}
            onVenueChange={setSelectedVenueId}
            placeholder="ALL VENUES"
          />
        )}
        <div className="bg-gray-900 border border-gray-700 p-4 sm:p-5">
          <div className="mb-4">
            <h3 className="font-mono text-xs sm:text-sm tracking-wider text-gray-400 uppercase mb-3">SELECT MENU</h3>
            <div className="space-y-2">
              <button
                onClick={() => setActiveTab('create')}
                className={`w-full p-3 font-mono text-xs tracking-wider uppercase transition-colors text-left ${
                  activeTab === 'create'
                    ? 'bg-white text-black'
                    : 'bg-gray-800 text-gray-400 hover:text-white border border-gray-700'
                }`}
              >
                <i className="ri-user-add-line mr-2"></i>
                CREATE
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`w-full p-3 font-mono text-xs tracking-wider uppercase transition-colors text-left ${
                  activeTab === 'users'
                    ? 'bg-white text-black'
                    : 'bg-gray-800 text-gray-400 hover:text-white border border-gray-700'
                }`}
              >
                <i className="ri-user-line mr-2"></i>
                USERS
              </button>
            </div>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-700 p-4 sm:p-5">
          <div className="mb-4">
            <h2 className="font-mono text-base sm:text-lg tracking-wider text-white uppercase mb-1">
              {tabInfo.title}
            </h2>
            <p className="text-gray-400 font-mono text-xs tracking-wider">
              {tabInfo.description}
            </p>
          </div>
          <div className="text-center mb-4">
            <div className="text-white font-mono text-3xl sm:text-4xl tracking-wider">
              {activeTab === 'users' ? users.length : '-'}
            </div>
            <div className="text-cyan-300 text-xs font-mono tracking-wider uppercase">
              {activeTab === 'users' ? 'TOTAL USERS' : ''}
            </div>
          </div>
          
          {activeTab === 'users' && (
            <StatGrid items={[
              { label: 'DJ', value: users.filter(u => u.role === 'dj').length, color: 'green' },
              { label: 'STAFF', value: users.filter(u => u.role === 'staff').length, color: 'cyan' },
              { label: 'DOOR', value: users.filter(u => u.role === 'door_staff').length, color: 'blue' },
              { label: 'ADMIN', value: users.filter(u => u.role === 'venue_admin').length, color: 'red' },
            ]} />
          )}
        </div>
      </div>

      <div className="lg:col-span-3">
        {activeTab === 'create' && (
          <InviteUser />
        )}

        {activeTab === 'users' && (
          <div className="bg-gray-900 border border-gray-700">
            <PanelHeader
              title="USER LIST"
              count={users.length}
              onRefresh={loadUsers}
            />
            <div className="p-4">
              {users.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-400 font-mono text-sm">No users found.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {users.map((user) => (
                    <UserCard 
                      key={user.id} 
                      user={user} 
                      onUpdate={handleUserUpdate}
                      onDelete={handleUserDelete}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function UserCard({ user, onUpdate, onDelete }: { 
  user: User; 
  onUpdate: (id: string, updates: { name?: string; guestLimit?: number; active?: boolean; role?: string }) => void;
  onDelete: (id: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    role: user.role,
    guestLimit: user.guestLimit,
    active: user.active
  });

  const handleSave = () => {
    onUpdate(user.id, editData);
    setIsEditing(false);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'super_admin': return 'text-purple-400';
      case 'venue_admin': return 'text-red-400';
      case 'door_staff': return 'text-blue-400';
      case 'staff': return 'text-cyan-400';
      case 'dj': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  // Available roles for editing depend on current user
  const editableRoles = ['venue_admin', 'door_staff', 'staff', 'dj'];

  return (
    <div className="bg-gray-900 border border-gray-700 p-4 sm:p-5">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-white font-mono text-sm sm:text-base tracking-wider">{user.name}</h3>
          <p className="text-gray-400 font-mono text-xs sm:text-sm">{user.email}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`font-mono text-xs tracking-wider uppercase ${getRoleColor(user.role)}`}>
            <RoleLabel role={user.role} />
          </span>
        </div>
      </div>

      {!isEditing ? (
        <div>
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div>
              <p className="text-gray-500 font-mono text-xs uppercase mb-1">Guest Limit</p>
              <p className="text-white font-mono text-xs sm:text-sm">{user.guestLimit}</p>
            </div>
            <div>
              <p className="text-gray-500 font-mono text-xs uppercase mb-1">Status</p>
              <p className={`font-mono text-xs sm:text-sm ${user.active ? 'text-green-400' : 'text-red-400'}`}>
                {user.active ? 'ACTIVE' : 'INACTIVE'}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setIsEditing(true)}
              className="bg-gray-700 hover:bg-gray-600 text-white font-mono text-xs tracking-wider uppercase py-2 sm:py-3 transition-colors"
            >
              EDIT
            </button>
            <button
              onClick={() => onDelete(user.id)}
              className="bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-700 font-mono text-xs tracking-wider uppercase py-2 sm:py-3 transition-colors"
            >
              DELETE
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="block text-gray-400 font-mono text-xs tracking-wider uppercase mb-2">
              Role
            </label>
            <div className="grid grid-cols-4 gap-1">
              {editableRoles.map((role) => (
                <button
                  key={role}
                  onClick={() => setEditData({...editData, role: role as any})}
                  className={`p-2 sm:p-3 border font-mono text-xs tracking-wider uppercase transition-colors ${
                    editData.role === role
                      ? 'bg-white text-black border-white'
                      : 'bg-gray-800 text-gray-400 border-gray-600 hover:text-white hover:border-gray-500'
                  }`}
                >
                  <RoleLabel role={role} />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-gray-400 font-mono text-xs tracking-wider uppercase mb-2">
              Guest limit
            </label>
            <input
              type="number"
              value={editData.guestLimit}
              onChange={(e) => setEditData({...editData, guestLimit: parseInt(e.target.value) || 0})}
              className="w-full bg-gray-800 border border-gray-600 px-3 py-2 sm:py-3 text-white font-mono text-sm focus:outline-none focus:border-white"
              min="0"
              max="999"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setEditData({...editData, active: !editData.active})}
              className={`flex-1 p-2 sm:p-3 border font-mono text-xs tracking-wider uppercase transition-colors ${
                editData.active
                  ? 'bg-green-600 text-white border-green-600'
                  : 'bg-red-600 text-white border-red-600'
              }`}
            >
              {editData.active ? 'ACTIVE' : 'INACTIVE'}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleSave}
              className="bg-green-600 hover:bg-green-700 text-white font-mono text-xs tracking-wider uppercase py-2 sm:py-3 transition-colors"
            >
              SAVE
            </button>
            <button
              onClick={() => {
                setIsEditing(false);
                setEditData({
                  role: user.role,
                  guestLimit: user.guestLimit,
                  active: user.active
                });
              }}
              className="bg-gray-700 hover:bg-gray-600 text-white font-mono text-xs tracking-wider uppercase py-2 sm:py-3 transition-colors"
            >
              CANCEL
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
