
'use client';

import { useState, useEffect } from 'react';
import InviteUser from './InviteUser';
import { getUser } from '../../../lib/auth';
import {
  fetchUsersByVenue,
  updateUserProfile,
  deleteUserViaEdge,
  fetchVenues,
  type User,
  type Venue,
} from '../../../lib/api/guests';

export default function UserManagement() {
  const [activeTab, setActiveTab] = useState<'create' | 'users'>('create');
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [selectedVenueId, setSelectedVenueId] = useState<string>('');

  const isSuperAdmin = currentUser?.role === 'super_admin';

  useEffect(() => {
    const user = getUser();
    setCurrentUser(user);
    // Load venues for super_admin
    if (user?.role === 'super_admin') {
      fetchVenues().then(({ data }) => {
        if (data) {
          setVenues(data);
          if (data.length > 0) setSelectedVenueId(data[0].id);
        }
      });
    }
  }, []);

  const effectiveVenueId = isSuperAdmin ? selectedVenueId : currentUser?.venue_id;

  useEffect(() => {
    if (activeTab === 'users' && effectiveVenueId) {
      loadUsers();
    }
  }, [activeTab, currentUser, effectiveVenueId]);

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
        alert('사용자 업데이트에 실패했습니다.');
      } else {
        await loadUsers();
      }
    } catch (error) {
      console.error('Failed to update user:', error);
    }
  };

  const handleUserDelete = async (userId: string) => {
    if (!confirm('이 사용자를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;
    try {
      const { error } = await deleteUserViaEdge(userId);
      if (error) {
        console.error('Failed to delete user:', error);
        alert('사용자 삭제에 실패했습니다.');
      } else {
        await loadUsers();
      }
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'super_admin': return 'SUPER ADMIN';
      case 'venue_admin': return 'VENUE ADMIN';
      case 'door_staff': return 'DOOR STAFF';
      case 'staff': return 'STAFF';
      case 'dj': return 'DJ';
      default: return role.toUpperCase();
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
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-6 h-6 border border-white border-t-transparent rounded-full animate-spin"></div>
        <span className="ml-2 text-white font-mono text-sm">LOADING...</span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-6">
      <div className="lg:col-span-1 space-y-4">
        {/* Venue selector for super_admin */}
        {isSuperAdmin && venues.length > 0 && (
          <div className="bg-gray-900 border border-gray-700 p-4 sm:p-5">
            <h3 className="font-mono text-xs sm:text-sm tracking-wider text-gray-400 uppercase mb-3">SELECT VENUE</h3>
            <div className="relative">
              <select
                value={selectedVenueId}
                onChange={(e) => setSelectedVenueId(e.target.value)}
                className="w-full appearance-none bg-gray-800 border border-gray-700 px-4 py-3 pr-10 text-white font-mono text-sm tracking-wider focus:outline-none focus:border-white"
              >
                <option value="">ALL VENUES</option>
                {venues.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
              <i className="ri-arrow-down-s-line absolute right-3 top-1/2 -translate-y-1/2 text-base text-gray-400 pointer-events-none"></i>
            </div>
          </div>
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
            <div className="text-gray-400 text-xs font-mono tracking-wider uppercase">
              {activeTab === 'users' ? 'TOTAL USERS' : ''}
            </div>
          </div>
          
          {activeTab === 'users' && (
            <div className="grid grid-cols-4 gap-px bg-gray-700">
              <div className="bg-gray-800 p-3 text-center">
                <div className="text-green-400 font-mono text-lg sm:text-xl tracking-wider">
                  {users.filter(u => u.role === 'dj').length}
                </div>
                <div className="text-gray-400 text-xs font-mono tracking-wider uppercase">
                  DJ
                </div>
              </div>
              <div className="bg-gray-800 p-3 text-center">
                <div className="text-cyan-400 font-mono text-lg sm:text-xl tracking-wider">
                  {users.filter(u => u.role === 'staff').length}
                </div>
                <div className="text-gray-400 text-xs font-mono tracking-wider uppercase">
                  STAFF
                </div>
              </div>
              <div className="bg-gray-800 p-3 text-center">
                <div className="text-blue-400 font-mono text-lg sm:text-xl tracking-wider">
                  {users.filter(u => u.role === 'door_staff').length}
                </div>
                <div className="text-gray-400 text-xs font-mono tracking-wider uppercase">
                  DOOR
                </div>
              </div>
              <div className="bg-gray-800 p-3 text-center">
                <div className="text-red-400 font-mono text-lg sm:text-xl tracking-wider">
                  {users.filter(u => u.role === 'venue_admin').length}
                </div>
                <div className="text-gray-400 text-xs font-mono tracking-wider uppercase">
                  ADMIN
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="lg:col-span-3">
        {activeTab === 'create' && (
          <InviteUser />
        )}

        {activeTab === 'users' && (
          <div className="bg-gray-900 border border-gray-700">
            <div className="border-b border-gray-700 p-4 flex items-center justify-between">
              <h3 className="font-mono text-xs sm:text-sm tracking-wider text-white uppercase">
                USER LIST ({users.length})
              </h3>
              <button
                onClick={loadUsers}
                className="px-3 py-1 bg-gray-800 text-gray-400 font-mono text-xs tracking-wider uppercase hover:text-white transition-colors border border-gray-700"
              >
                <i className="ri-refresh-line mr-1"></i>REFRESH
              </button>
            </div>
            <div className="p-4">
              {users.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-400 font-mono text-sm">등록된 사용자가 없습니다.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {users.map((user) => (
                    <UserCard 
                      key={user.id} 
                      user={user} 
                      currentUserRole={currentUser?.role}
                      getRoleLabel={getRoleLabel}
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

function UserCard({ user, currentUserRole, getRoleLabel, onUpdate, onDelete }: { 
  user: User; 
  currentUserRole: string;
  getRoleLabel: (role: string) => string;
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
            {getRoleLabel(user.role)}
          </span>
          {!user.active && (
            <span className="bg-red-600 text-white px-2 py-1 font-mono text-xs tracking-wider uppercase">
              비활성
            </span>
          )}
        </div>
      </div>

      {!isEditing ? (
        <div>
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div>
              <p className="text-gray-500 font-mono text-xs uppercase mb-1">Guest Limit</p>
              <p className="text-white font-mono text-xs sm:text-sm">{user.guestLimit}명</p>
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
              수정
            </button>
            <button
              onClick={() => onDelete(user.id)}
              className="bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-700 font-mono text-xs tracking-wider uppercase py-2 sm:py-3 transition-colors"
            >
              삭제
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
                  {getRoleLabel(role)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-gray-400 font-mono text-xs tracking-wider uppercase mb-2">
              게스트 제한 인원
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
              {editData.active ? '활성' : '비활성'}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleSave}
              className="bg-green-600 hover:bg-green-700 text-white font-mono text-xs tracking-wider uppercase py-2 sm:py-3 transition-colors"
            >
              저장
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
              취소
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
