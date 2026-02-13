
'use client';

import { useState, useEffect, useCallback } from 'react';
import { getUser } from '../../../lib/auth';
import {
  fetchExternalLinksByDate,
  createExternalLink,
  deleteExternalLink,
  deactivateExternalLink,
  fetchVenues,
  type ExternalDJLink,
  type Venue,
} from '../../../lib/api/guests';

interface LinkManagementProps {
  selectedDate: string;
}

export default function LinkManagement({ selectedDate }: LinkManagementProps) {
  const [activeTab, setActiveTab] = useState<'create' | 'manage'>('create');
  const [formData, setFormData] = useState({
    date: selectedDate,
    dj: '',
    event: '',
    maxGuests: 5
  });
  const [generatedLink, setGeneratedLink] = useState<ExternalDJLink | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [links, setLinks] = useState<ExternalDJLink[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loadingStates, setLoadingStates] = useState<{[key: string]: boolean}>({});
  const [error, setError] = useState<string | null>(null);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [selectedVenueId, setSelectedVenueId] = useState<string>('');

  const user = getUser();
  const isSuperAdmin = user?.role === 'super_admin';
  const venueId = isSuperAdmin ? selectedVenueId : user?.venue_id;

  // Load venues for super_admin
  useEffect(() => {
    if (isSuperAdmin) {
      fetchVenues().then(({ data }) => {
        if (data) {
          setVenues(data);
          if (data.length > 0 && !selectedVenueId) {
            setSelectedVenueId(data[0].id);
          }
        }
      });
    }
  }, [isSuperAdmin]);

  // Update form date when selectedDate prop changes
  useEffect(() => {
    setFormData(prev => ({ ...prev, date: selectedDate }));
  }, [selectedDate]);

  const loadLinks = useCallback(async () => {
    if (!venueId) return;
    setIsFetching(true);
    try {
      const { data, error } = await fetchExternalLinksByDate(venueId, selectedDate);
      if (error) {
        console.error('Failed to load links:', error);
      } else if (data) {
        setLinks(data);
      }
    } catch (err) {
      console.error('Failed to load links:', err);
    } finally {
      setIsFetching(false);
    }
  }, [venueId, selectedDate]);

  useEffect(() => {
    if (activeTab === 'manage') {
      loadLinks();
    }
  }, [activeTab, loadLinks]);

  const getGuestPageUrl = (token: string) => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/guest?token=${token}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.date || !formData.dj || !formData.event || !venueId) return;

    setIsGenerating(true);
    setError(null);

    const { data, error } = await createExternalLink({
      venueId,
      djName: formData.dj,
      event: formData.event,
      date: formData.date,
      maxGuests: formData.maxGuests,
      createdBy: user?.id,
    });

    if (error) {
      console.error('Failed to create link:', error);
      setError('링크 생성에 실패했습니다.');
    } else if (data) {
      setGeneratedLink(data);
      setFormData({ date: selectedDate, dj: '', event: '', maxGuests: 5 });
    }

    setIsGenerating(false);
  };

  const copyToClipboard = async (text: string, id?: string) => {
    if (id) {
      setLoadingStates(prev => ({ ...prev, [`copy_${id}`]: true }));
    } else {
      setIsCopying(true);
    }
    
    try {
      await navigator.clipboard.writeText(text);
      if (id) {
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
      }
    } catch (err) {
      console.error('복사 실패:', err);
    }
    
    setTimeout(() => {
      if (id) {
        setLoadingStates(prev => ({ ...prev, [`copy_${id}`]: false }));
      } else {
        setIsCopying(false);
      }
    }, 100);
  };

  const handleDeleteLink = async (id: string) => {
    if (!confirm('DELETE THIS LINK?')) return;
    setLoadingStates(prev => ({ ...prev, [`delete_${id}`]: true }));
    const { error } = await deleteExternalLink(id);
    if (error) {
      console.error('Failed to delete link:', error);
      alert('링크 삭제에 실패했습니다.');
    } else {
      setLinks(prev => prev.filter(link => link.id !== id));
    }
    setLoadingStates(prev => ({ ...prev, [`delete_${id}`]: false }));
  };

  const handleDeactivateLink = async (id: string) => {
    setLoadingStates(prev => ({ ...prev, [`deactivate_${id}`]: true }));
    const { error } = await deactivateExternalLink(id);
    if (error) {
      console.error('Failed to deactivate link:', error);
    } else {
      setLinks(prev => prev.map(link => link.id === id ? { ...link, active: false } : link));
    }
    setLoadingStates(prev => ({ ...prev, [`deactivate_${id}`]: false }));
  };

  const formatDateDisplay = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
  };

  const activeLinks = links.filter(l => l.active);
  const inactiveLinks = links.filter(l => !l.active);

  const getTabInfo = () => {
    switch (activeTab) {
      case 'create':
        return { title: 'CREATE LINK', description: 'Generate new access code' };
      case 'manage':
        return { title: 'MANAGE LINKS', description: 'View and manage codes' };
      default:
        return { title: '', description: '' };
    }
  };

  const tabInfo = getTabInfo();

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
                <i className="ri-add-line mr-2"></i>
                CREATE
              </button>
              <button
                onClick={() => setActiveTab('manage')}
                className={`w-full p-3 font-mono text-xs tracking-wider uppercase transition-colors text-left ${
                  activeTab === 'manage'
                    ? 'bg-white text-black'
                    : 'bg-gray-800 text-gray-400 hover:text-white border border-gray-700'
                }`}
              >
                <i className="ri-link mr-2"></i>
                MANAGE
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
            <p className="text-gray-400 font-mono text-xs tracking-wider mt-1">
              {formatDateDisplay(selectedDate)}
            </p>
          </div>
          <div className="text-center mb-4">
            <div className="text-white font-mono text-3xl sm:text-4xl tracking-wider">
              {links.length}
            </div>
            <div className="text-gray-400 text-xs font-mono tracking-wider uppercase">
              TOTAL LINKS
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-px bg-gray-700">
            <div className="bg-gray-800 p-3 text-center">
              <div className="text-green-400 font-mono text-lg sm:text-xl tracking-wider">
                {activeLinks.length}
              </div>
              <div className="text-gray-400 text-xs font-mono tracking-wider uppercase">
                ACTIVE
              </div>
            </div>
            <div className="bg-gray-800 p-3 text-center">
              <div className="text-gray-500 font-mono text-lg sm:text-xl tracking-wider">
                {inactiveLinks.length}
              </div>
              <div className="text-gray-400 text-xs font-mono tracking-wider uppercase">
                EXPIRED
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="lg:col-span-3">
        {activeTab === 'create' && (
          <div className="space-y-6">
            <div className="bg-gray-900 border border-gray-700 p-4 sm:p-6">
              <div className="mb-6">
                <h2 className="font-mono text-sm sm:text-base tracking-wider text-white uppercase mb-1">CREATE ACCESS LINK</h2>
                <p className="text-gray-400 font-mono text-xs tracking-wider uppercase">GENERATE NEW GUEST CODE FOR EXTERNAL DJ</p>
              </div>

              {error && (
                <div className="mb-4 bg-red-900/30 border border-red-700 p-3">
                  <p className="text-red-400 font-mono text-xs tracking-wider">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <label className="block font-mono text-xs tracking-wider text-gray-400 uppercase mb-2">
                      DATE
                    </label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full bg-black border border-gray-600 px-4 py-3 text-white font-mono text-sm tracking-wider focus:outline-none focus:border-white"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block font-mono text-xs tracking-wider text-gray-400 uppercase mb-2">
                      DJ NAME
                    </label>
                    <input
                      type="text"
                      value={formData.dj}
                      onChange={(e) => setFormData({ ...formData, dj: e.target.value.toUpperCase() })}
                      className="w-full bg-black border border-gray-600 px-4 py-3 text-white font-mono text-sm tracking-wider focus:outline-none focus:border-white uppercase"
                      placeholder="DJ NAME"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-mono text-xs tracking-wider text-gray-400 uppercase mb-2">
                    EVENT NAME
                  </label>
                  <input
                    type="text"
                    value={formData.event}
                    onChange={(e) => setFormData({ ...formData, event: e.target.value.toUpperCase() })}
                    className="w-full bg-black border border-gray-600 px-4 py-3 text-white font-mono text-sm tracking-wider focus:outline-none focus:border-white uppercase"
                    placeholder="EVENT NAME"
                    required
                  />
                </div>

                <div>
                  <label className="block font-mono text-xs tracking-wider text-gray-400 uppercase mb-2">
                    MAX GUESTS
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={formData.maxGuests}
                    onChange={(e) => setFormData({ ...formData, maxGuests: parseInt(e.target.value) })}
                    className="w-full bg-black border border-gray-600 px-4 py-3 text-white font-mono text-sm tracking-wider focus:outline-none focus:border-white"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isGenerating}
                  className="w-full bg-white text-black py-3 sm:py-4 font-mono text-sm tracking-wider uppercase hover:bg-gray-200 transition-colors disabled:bg-gray-600 disabled:text-gray-400 disabled:opacity-50"
                >
                  {isGenerating ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                      GENERATING...
                    </div>
                  ) : (
                    'GENERATE LINK'
                  )}
                </button>
              </form>
            </div>

            {generatedLink && (
              <div className="bg-gray-900 border border-gray-700 p-4 sm:p-6">
                <div className="mb-4">
                  <h3 className="font-mono text-sm tracking-wider text-white uppercase mb-2">GENERATED ACCESS LINK</h3>
                  <p className="text-gray-400 font-mono text-xs">
                    {generatedLink.djName} — {generatedLink.event} | MAX: {generatedLink.maxGuests}
                  </p>
                </div>
                
                <div className="bg-black border border-gray-700 p-4 mb-4">
                  <div className="font-mono text-xs tracking-wider text-gray-400 mb-1">GUEST URL</div>
                  <div className="font-mono text-sm tracking-wider text-white break-all">
                    {getGuestPageUrl(generatedLink.token)}
                  </div>
                </div>
                
                <button
                  onClick={() => copyToClipboard(getGuestPageUrl(generatedLink.token))}
                  disabled={isCopying}
                  className="w-full bg-white text-black py-3 font-mono text-xs tracking-wider uppercase hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  {isCopying ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                      COPYING...
                    </div>
                  ) : (
                    'COPY LINK'
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'manage' && (
          <div className="bg-gray-900 border border-gray-700">
            <div className="border-b border-gray-700 p-4 flex items-center justify-between">
              <h3 className="font-mono text-xs sm:text-sm tracking-wider text-white uppercase">
                LINK LIST ({links.length})
              </h3>
              <button
                onClick={loadLinks}
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
            ) : (
              <div className="divide-y divide-gray-700 max-h-[500px] lg:max-h-[600px] overflow-y-auto">
                {links.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="w-16 h-16 border border-gray-600 mx-auto mb-4 flex items-center justify-center">
                      <i className="ri-link text-gray-400 text-2xl"></i>
                    </div>
                    <p className="text-gray-400 font-mono text-sm tracking-wider uppercase">
                      NO LINKS FOUND FOR THIS DATE
                    </p>
                  </div>
                ) : (
                  links.map((link, index) => (
                    <div key={link.id} className={`p-4 ${!link.active ? 'opacity-50' : ''}`}>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 sm:w-8 sm:h-8 border border-gray-600 flex items-center justify-center">
                            <span className="text-xs font-mono text-gray-400">
                              {String(index + 1).padStart(2, '0')}
                            </span>
                          </div>
                          <div>
                            <p className="font-mono text-sm tracking-wider text-white uppercase">
                              {link.djName} - {link.event}
                            </p>
                            <p className="text-xs font-mono text-gray-400 mt-1">
                              MAX: {link.maxGuests} | USED: {link.usedGuests} | {link.active ? (
                                <span className="text-green-400">ACTIVE</span>
                              ) : (
                                <span className="text-red-400">INACTIVE</span>
                              )}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-black border border-gray-700 p-3 mb-4">
                        <div className="mb-1">
                          <span className="font-mono text-xs tracking-wider text-gray-400 uppercase">GUEST URL</span>
                        </div>
                        <div className="font-mono text-xs tracking-wider text-white break-all">
                          {getGuestPageUrl(link.token)}
                        </div>
                      </div>

                      {/* Usage progress bar */}
                      <div className="mb-4">
                        <div className="flex justify-between text-xs font-mono text-gray-400 mb-1">
                          <span>USAGE</span>
                          <span>{link.usedGuests}/{link.maxGuests}</span>
                        </div>
                        <div className="w-full bg-gray-800 h-1">
                          <div 
                            className={`h-1 transition-all ${link.usedGuests >= link.maxGuests ? 'bg-red-500' : 'bg-green-500'}`}
                            style={{ width: `${Math.min((link.usedGuests / link.maxGuests) * 100, 100)}%` }}
                          ></div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-px bg-gray-700">
                        <button
                          onClick={() => copyToClipboard(getGuestPageUrl(link.token), link.id)}
                          disabled={loadingStates[`copy_${link.id}`]}
                          className="bg-white text-black py-2 font-mono text-xs tracking-wider uppercase hover:bg-gray-200 transition-colors disabled:opacity-50"
                        >
                          {loadingStates[`copy_${link.id}`] ? (
                            <div className="flex items-center justify-center">
                              <div className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                            </div>
                          ) : copiedId === link.id ? (
                            'COPIED'
                          ) : (
                            'COPY'
                          )}
                        </button>
                        {link.active && (
                          <button
                            onClick={() => handleDeactivateLink(link.id)}
                            disabled={loadingStates[`deactivate_${link.id}`]}
                            className="bg-gray-900 border border-gray-600 text-yellow-400 py-2 font-mono text-xs tracking-wider uppercase hover:bg-gray-800 transition-colors disabled:opacity-50"
                          >
                            DEACTIVATE
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteLink(link.id)}
                          disabled={loadingStates[`delete_${link.id}`]}
                          className="bg-gray-900 border border-gray-600 text-red-400 py-2 font-mono text-xs tracking-wider uppercase hover:bg-gray-800 transition-colors disabled:opacity-50"
                        >
                          {loadingStates[`delete_${link.id}`] ? (
                            <div className="flex items-center justify-center">
                              <div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                          ) : (
                            'DELETE'
                          )}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
