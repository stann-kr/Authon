'use client';

import { useState, useEffect } from 'react';

interface InviteLink {
  id: string;
  email: string;
  name: string;
  role: string;
  guest_limit: number;
  link: string;
  created_at: string;
  used: boolean;
}

export default function InviteUser() {
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    role: 'DJ',
    guest_limit: 20
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');
  const [inviteLinks, setInviteLinks] = useState<InviteLink[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setGeneratedLink('');

    try {
      const inviteId = `invite_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const newInvite: InviteLink = {
        id: inviteId,
        email: formData.email,
        name: formData.name,
        role: formData.role,
        guest_limit: formData.guest_limit,
        link: `${window.location.origin}/auth/invite/${inviteId}`,
        created_at: new Date().toISOString(),
        used: false
      };

      const existingInvites = JSON.parse(localStorage.getItem('inviteLinks') || '[]');
      const updatedInvites = [...existingInvites, newInvite];
      localStorage.setItem('inviteLinks', JSON.stringify(updatedInvites));

      setGeneratedLink(newInvite.link);
      loadInviteLinks();
      setFormData({
        email: '',
        name: '',
        role: 'DJ',
        guest_limit: 20
      });
    } catch (error) {
      setError('초대 링크 생성 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadInviteLinks = () => {
    try {
      const invites = JSON.parse(localStorage.getItem('inviteLinks') || '[]');
      setInviteLinks(invites);
    } catch (error) {
      console.error('Failed to load invite links:', error);
      setInviteLinks([]);
    }
  };

  const copyToClipboard = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      alert('링크가 복사되었습니다!');
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const deleteInvite = (inviteId: string) => {
    try {
      const existingInvites = JSON.parse(localStorage.getItem('inviteLinks') || '[]');
      const updatedInvites = existingInvites.filter((invite: InviteLink) => invite.id !== inviteId);
      localStorage.setItem('inviteLinks', JSON.stringify(updatedInvites));
      loadInviteLinks();
    } catch (error) {
      console.error('Failed to delete invite:', error);
    }
  };

  useEffect(() => {
    loadInviteLinks();
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-gray-900 border border-gray-700 p-6">
        <h2 className="font-mono text-lg tracking-wider text-white uppercase mb-4">
          INVITE NEW USER
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-400 font-mono text-xs tracking-wider uppercase mb-2">
              EMAIL ADDRESS
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
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
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full bg-black border border-gray-700 px-4 py-3 text-white font-mono text-sm tracking-wider focus:outline-none focus:border-white"
              placeholder="John Doe"
              required
            />
          </div>

          <div>
            <label className="block text-gray-400 font-mono text-xs tracking-wider uppercase mb-2">
              ROLE
            </label>
            <div className="grid grid-cols-3 gap-2">
              {['DJ', 'Door', 'Admin'].map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setFormData({...formData, role})}
                  className={`p-3 border font-mono text-xs tracking-wider uppercase transition-colors ${
                    formData.role === role
                      ? 'bg-white text-black border-white'
                      : 'bg-black text-gray-400 border-gray-700 hover:text-white hover:border-gray-500'
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-gray-400 font-mono text-xs tracking-wider uppercase mb-2">
              GUEST LIMIT
            </label>
            <input
              type="number"
              value={formData.guest_limit}
              onChange={(e) => setFormData({...formData, guest_limit: parseInt(e.target.value) || 1})}
              className="w-full bg-black border border-gray-700 px-4 py-3 text-white font-mono text-sm tracking-wider focus:outline-none focus:border-white"
              min="1"
              required
            />
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-700 p-3">
              <p className="text-red-400 font-mono text-xs tracking-wider">
                {error}
              </p>
            </div>
          )}

          {generatedLink && (
            <div className="bg-green-900/30 border border-green-700 p-4">
              <p className="text-green-400 font-mono text-xs tracking-wider uppercase mb-2">
                INVITE LINK GENERATED
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={generatedLink}
                  readOnly
                  className="flex-1 bg-black border border-green-700 px-3 py-2 text-green-400 font-mono text-xs tracking-wider"
                />
                <button
                  type="button"
                  onClick={() => copyToClipboard(generatedLink)}
                  className="px-4 py-2 bg-green-700 text-white font-mono text-xs tracking-wider uppercase hover:bg-green-600 transition-colors"
                >
                  COPY
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-white text-black py-3 font-mono text-sm tracking-wider uppercase hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            {isLoading ? 'GENERATING...' : 'GENERATE INVITE LINK'}
          </button>
        </form>
      </div>

      <div className="bg-gray-900 border border-gray-700 p-6">
        <h2 className="font-mono text-lg tracking-wider text-white uppercase mb-4">
          PENDING INVITES
        </h2>

        <div className="space-y-3">
          {inviteLinks.filter(invite => !invite.used).length === 0 ? (
            <p className="text-gray-500 font-mono text-xs tracking-wider text-center py-8">
              NO PENDING INVITES
            </p>
          ) : (
            inviteLinks.filter(invite => !invite.used).map((invite) => (
              <div key={invite.id} className="bg-black border border-gray-700 p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-white font-mono text-sm tracking-wider uppercase">
                      {invite.name}
                    </p>
                    <p className="text-gray-400 font-mono text-xs tracking-wider">
                      {invite.email}
                    </p>
                    <p className="text-gray-500 font-mono text-xs tracking-wider mt-1">
                      ROLE: {invite.role} • LIMIT: {invite.guest_limit}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteInvite(invite.id)}
                    className="w-8 h-8 border border-red-700 bg-red-900/30 hover:bg-red-900/50 transition-colors flex items-center justify-center"
                  >
                    <i className="ri-delete-bin-line text-red-400 text-sm"></i>
                  </button>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={invite.link}
                    readOnly
                    className="flex-1 bg-gray-900 border border-gray-700 px-3 py-2 text-gray-400 font-mono text-xs tracking-wider"
                  />
                  <button
                    onClick={() => copyToClipboard(invite.link)}
                    className="px-4 py-2 bg-gray-700 text-white font-mono text-xs tracking-wider uppercase hover:bg-gray-600 transition-colors"
                  >
                    COPY
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
