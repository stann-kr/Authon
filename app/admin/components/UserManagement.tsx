
'use client';

import { useState, useEffect } from 'react';
import InviteUser from './InviteUser';

interface UserApplication {
  id: string;
  email: string;
  name: string;
  requested_role: string;
  message: string;
  status: string;
  created_at: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  guest_limit: number;
  is_active: boolean;
  created_at: string;
}

export default function UserManagement() {
  const [activeTab, setActiveTab] = useState<'applications' | 'users' | 'invite'>('invite');
  const [applications, setApplications] = useState<UserApplication[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = () => {
    setIsLoading(true);
    try {
      if (activeTab === 'applications') {
        const storedApplications = localStorage.getItem('userApplications');
        setApplications(storedApplications ? JSON.parse(storedApplications) : []);
      } else if (activeTab === 'users') {
        const storedUsers = localStorage.getItem('users');
        setUsers(storedUsers ? JSON.parse(storedUsers) : []);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplicationAction = (applicationId: string, action: 'approve' | 'reject', guestLimit?: number) => {
    try {
      const storedApplications = localStorage.getItem('userApplications');
      const applications: UserApplication[] = storedApplications ? JSON.parse(storedApplications) : [];
      
      const application = applications.find(app => app.id === applicationId);
      if (!application) return;

      if (action === 'approve') {
        const storedUsers = localStorage.getItem('users');
        const users: User[] = storedUsers ? JSON.parse(storedUsers) : [];
        
        const newUser: User = {
          id: `user_${Date.now()}`,
          email: application.email,
          name: application.name,
          role: application.requested_role,
          guest_limit: guestLimit || 20,
          is_active: true,
          created_at: new Date().toISOString()
        };
        
        users.push(newUser);
        localStorage.setItem('users', JSON.stringify(users));
        
        application.status = 'approved';
      } else {
        application.status = 'rejected';
      }
      
      localStorage.setItem('userApplications', JSON.stringify(applications));
      loadData();
    } catch (error) {
      console.error('Failed to process application:', error);
    }
  };

  const handleUserUpdate = (userId: string, updates: Partial<User>) => {
    try {
      const storedUsers = localStorage.getItem('users');
      const users: User[] = storedUsers ? JSON.parse(storedUsers) : [];
      
      const userIndex = users.findIndex(u => u.id === userId);
      if (userIndex !== -1) {
        users[userIndex] = { ...users[userIndex], ...updates };
        localStorage.setItem('users', JSON.stringify(users));
        loadData();
      }
    } catch (error) {
      console.error('Failed to update user:', error);
    }
  };

  const getTabInfo = () => {
    switch (activeTab) {
      case 'invite':
        return { title: 'INVITE USER', description: 'Send invitation links' };
      case 'applications':
        return { title: 'APPLICATIONS', description: 'Pending registrations' };
      case 'users':
        return { title: 'USER LIST', description: 'Manage existing users' };
      default:
        return { title: '', description: '' };
    }
  };

  const tabInfo = getTabInfo();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-6 h-6 border border-white border-t-transparent rounded-full animate-spin"></div>
        <span className="ml-2 text-white font-mono text-sm">LOADING...</span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <div className="lg:col-span-1 space-y-4">
        <div className="bg-gray-900 border border-gray-700 p-4 sm:p-5">
          <div className="mb-4">
            <h3 className="font-mono text-xs sm:text-sm tracking-wider text-gray-400 uppercase mb-3">SELECT MENU</h3>
            <div className="space-y-2">
              <button
                onClick={() => setActiveTab('invite')}
                className={`w-full p-3 font-mono text-xs tracking-wider uppercase transition-colors text-left ${
                  activeTab === 'invite'
                    ? 'bg-white text-black'
                    : 'bg-gray-800 text-gray-400 hover:text-white border border-gray-700'
                }`}
              >
                <i className="ri-mail-send-line mr-2"></i>
                INVITE
              </button>
              <button
                onClick={() => setActiveTab('applications')}
                className={`w-full p-3 font-mono text-xs tracking-wider uppercase transition-colors text-left ${
                  activeTab === 'applications'
                    ? 'bg-white text-black'
                    : 'bg-gray-800 text-gray-400 hover:text-white border border-gray-700'
                }`}
              >
                <i className="ri-file-list-3-line mr-2"></i>
                APPLICATIONS
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
              {activeTab === 'applications' ? applications.filter(a => a.status === 'pending').length : 
               activeTab === 'users' ? users.length : '-'}
            </div>
            <div className="text-gray-400 text-xs font-mono tracking-wider uppercase">
              {activeTab === 'applications' ? 'PENDING' : 
               activeTab === 'users' ? 'TOTAL USERS' : ''}
            </div>
          </div>
          
          {activeTab === 'users' && (
            <div className="grid grid-cols-3 gap-px bg-gray-700">
              <div className="bg-gray-800 p-3 text-center">
                <div className="text-green-400 font-mono text-lg sm:text-xl tracking-wider">
                  {users.filter(u => u.role === 'DJ').length}
                </div>
                <div className="text-gray-400 text-xs font-mono tracking-wider uppercase">
                  DJ
                </div>
              </div>
              <div className="bg-gray-800 p-3 text-center">
                <div className="text-blue-400 font-mono text-lg sm:text-xl tracking-wider">
                  {users.filter(u => u.role === 'Door').length}
                </div>
                <div className="text-gray-400 text-xs font-mono tracking-wider uppercase">
                  DOOR
                </div>
              </div>
              <div className="bg-gray-800 p-3 text-center">
                <div className="text-red-400 font-mono text-lg sm:text-xl tracking-wider">
                  {users.filter(u => u.role === 'Admin').length}
                </div>
                <div className="text-gray-400 text-xs font-mono tracking-wider uppercase">
                  ADMIN
                </div>
              </div>
            </div>
          )}

          {activeTab === 'applications' && (
            <div className="grid grid-cols-3 gap-px bg-gray-700">
              <div className="bg-gray-800 p-3 text-center">
                <div className="text-yellow-400 font-mono text-lg sm:text-xl tracking-wider">
                  {applications.filter(a => a.status === 'pending').length}
                </div>
                <div className="text-gray-400 text-xs font-mono tracking-wider uppercase">
                  PENDING
                </div>
              </div>
              <div className="bg-gray-800 p-3 text-center">
                <div className="text-green-400 font-mono text-lg sm:text-xl tracking-wider">
                  {applications.filter(a => a.status === 'approved').length}
                </div>
                <div className="text-gray-400 text-xs font-mono tracking-wider uppercase">
                  APPROVED
                </div>
              </div>
              <div className="bg-gray-800 p-3 text-center">
                <div className="text-red-400 font-mono text-lg sm:text-xl tracking-wider">
                  {applications.filter(a => a.status === 'rejected').length}
                </div>
                <div className="text-gray-400 text-xs font-mono tracking-wider uppercase">
                  REJECTED
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="lg:col-span-3">
        {activeTab === 'invite' && (
          <InviteUser />
        )}

        {activeTab === 'applications' && (
          <div className="bg-gray-900 border border-gray-700">
            <div className="border-b border-gray-700 p-4">
              <h3 className="font-mono text-xs sm:text-sm tracking-wider text-white uppercase">
                APPLICATIONS ({applications.length})
              </h3>
            </div>
            <div className="p-4">
              {applications.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-400 font-mono text-sm">신청된 회원가입이 없습니다.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {applications.map((app) => (
                    <ApplicationCard 
                      key={app.id} 
                      application={app} 
                      onAction={handleApplicationAction}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="bg-gray-900 border border-gray-700">
            <div className="border-b border-gray-700 p-4">
              <h3 className="font-mono text-xs sm:text-sm tracking-wider text-white uppercase">
                USER LIST ({users.length})
              </h3>
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
                      onUpdate={handleUserUpdate}
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

function ApplicationCard({ application, onAction }: { 
  application: UserApplication; 
  onAction: (id: string, action: 'approve' | 'reject', guestLimit?: number) => void;
}) {
  const [guestLimit, setGuestLimit] = useState(application.requested_role === 'DJ' ? 20 : 50);
  const [showApproveForm, setShowApproveForm] = useState(false);

  const handleApprove = () => {
    onAction(application.id, 'approve', guestLimit);
    setShowApproveForm(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-400';
      case 'approved': return 'text-green-400';
      case 'rejected': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return '대기중';
      case 'approved': return '승인됨';
      case 'rejected': return '거절됨';
      default: return status;
    }
  };

  return (
    <div className="bg-gray-900 border border-gray-700 p-4 sm:p-5">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-white font-mono text-sm sm:text-base tracking-wider">{application.name}</h3>
          <p className="text-gray-400 font-mono text-xs sm:text-sm">{application.email}</p>
        </div>
        <span className={`font-mono text-xs tracking-wider uppercase ${getStatusColor(application.status)}`}>
          {getStatusText(application.status)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-3">
        <div>
          <p className="text-gray-500 font-mono text-xs uppercase mb-1">Role</p>
          <p className="text-white font-mono text-xs sm:text-sm">{application.requested_role}</p>
        </div>
        <div>
          <p className="text-gray-500 font-mono text-xs uppercase mb-1">Applied</p>
          <p className="text-white font-mono text-xs sm:text-sm">
            {new Date(application.created_at).toLocaleDateString('ko-KR')}
          </p>
        </div>
      </div>

      {application.message && (
        <div className="mb-4">
          <p className="text-gray-500 font-mono text-xs uppercase mb-1">Message</p>
          <p className="text-gray-300 font-mono text-xs leading-relaxed">
            {application.message}
          </p>
        </div>
      )}

      {application.status === 'pending' && (
        <div className="space-y-3">
          {!showApproveForm ? (
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setShowApproveForm(true)}
                className="bg-green-600 hover:bg-green-700 text-white font-mono text-xs tracking-wider uppercase py-2 sm:py-3 transition-colors"
              >
                승인
              </button>
              <button
                onClick={() => onAction(application.id, 'reject')}
                className="bg-red-600 hover:bg-red-700 text-white font-mono text-xs tracking-wider uppercase py-2 sm:py-3 transition-colors"
              >
                거절
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-gray-400 font-mono text-xs tracking-wider uppercase mb-2">
                  게스트 제한 인원
                </label>
                <input
                  type="number"
                  value={guestLimit}
                  onChange={(e) => setGuestLimit(parseInt(e.target.value) || 0)}
                  className="w-full bg-gray-800 border border-gray-600 px-3 py-2 sm:py-3 text-white font-mono text-sm focus:outline-none focus:border-white"
                  min="0"
                  max="999"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleApprove}
                  className="bg-green-600 hover:bg-green-700 text-white font-mono text-xs tracking-wider uppercase py-2 sm:py-3 transition-colors"
                >
                  확인
                </button>
                <button
                  onClick={() => setShowApproveForm(false)}
                  className="bg-gray-700 hover:bg-gray-600 text-white font-mono text-xs tracking-wider uppercase py-2 sm:py-3 transition-colors"
                >
                  취소
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function UserCard({ user, onUpdate }: { 
  user: User; 
  onUpdate: (id: string, updates: Partial<User>) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    role: user.role,
    guest_limit: user.guest_limit,
    is_active: user.is_active
  });

  const handleSave = () => {
    onUpdate(user.id, editData);
    setIsEditing(false);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'Admin': return 'text-red-400';
      case 'Door': return 'text-blue-400';
      case 'DJ': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="bg-gray-900 border border-gray-700 p-4 sm:p-5">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-white font-mono text-sm sm:text-base tracking-wider">{user.name}</h3>
          <p className="text-gray-400 font-mono text-xs sm:text-sm">{user.email}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`font-mono text-xs tracking-wider uppercase ${getRoleColor(user.role)}`}>
            {user.role}
          </span>
          {!user.is_active && (
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
              <p className="text-white font-mono text-xs sm:text-sm">{user.guest_limit}명</p>
            </div>
            <div>
              <p className="text-gray-500 font-mono text-xs uppercase mb-1">Joined</p>
              <p className="text-white font-mono text-xs sm:text-sm">
                {new Date(user.created_at).toLocaleDateString('ko-KR')}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsEditing(true)}
            className="w-full bg-gray-700 hover:bg-gray-600 text-white font-mono text-xs tracking-wider uppercase py-2 sm:py-3 transition-colors"
          >
            수정
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="block text-gray-400 font-mono text-xs tracking-wider uppercase mb-2">
              Role
            </label>
            <div className="grid grid-cols-3 gap-1">
              {['DJ', 'Door', 'Admin'].map((role) => (
                <button
                  key={role}
                  onClick={() => setEditData({...editData, role})}
                  className={`p-2 sm:p-3 border font-mono text-xs tracking-wider uppercase transition-colors ${
                    editData.role === role
                      ? 'bg-white text-black border-white'
                      : 'bg-gray-800 text-gray-400 border-gray-600 hover:text-white hover:border-gray-500'
                  }`}
                >
                  {role}
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
              value={editData.guest_limit}
              onChange={(e) => setEditData({...editData, guest_limit: parseInt(e.target.value) || 0})}
              className="w-full bg-gray-800 border border-gray-600 px-3 py-2 sm:py-3 text-white font-mono text-sm focus:outline-none focus:border-white"
              min="0"
              max="999"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setEditData({...editData, is_active: !editData.is_active})}
              className={`flex-1 p-2 sm:p-3 border font-mono text-xs tracking-wider uppercase transition-colors ${
                editData.is_active
                  ? 'bg-green-600 text-white border-green-600'
                  : 'bg-red-600 text-white border-red-600'
              }`}
            >
              {editData.is_active ? '활성' : '비활성'}
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
                  guest_limit: user.guest_limit,
                  is_active: user.is_active
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
