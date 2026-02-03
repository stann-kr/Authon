
'use client';

import { useState } from 'react';

interface GeneratedLink {
  id: string;
  date: string;
  dj: string;
  event: string;
  maxGuests: number;
  url: string;
  createdAt: string;
}

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
  const [generatedLink, setGeneratedLink] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCopying, setIsCopying] = useState(false);

  const [links, setLinks] = useState<GeneratedLink[]>([
    {
      id: '1',
      date: '2025-08-30',
      dj: 'JK',
      event: 'INVITES: KERRIE',
      maxGuests: 5,
      url: 'Y2FG7QMNGKFMHSFTFU',
      createdAt: '2025-08-25 14:30'
    },
    {
      id: '2',
      date: '2025-08-30',
      dj: 'MUJ',
      event: 'INVITES: KERRIE',
      maxGuests: 5,
      url: 'E1QJW069XSG3UHCLPQ',
      createdAt: '2025-08-25 14:35'
    },
    {
      id: '3',
      date: '2025-08-29',
      dj: 'FDA',
      event: 'Authon NACHT',
      maxGuests: 5,
      url: 'HZZBRMZTWYJ8GKONWPLG',
      createdAt: '2025-08-25 14:40'
    }
  ]);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loadingStates, setLoadingStates] = useState<{[key: string]: boolean}>({});

  const generateRandomString = (length: number) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.date || !formData.dj || !formData.event) return;

    setIsGenerating(true);
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const newLink = generateRandomString(18);
    const newLinkData: GeneratedLink = {
      id: Date.now().toString(),
      date: formData.date,
      dj: formData.dj,
      event: formData.event,
      maxGuests: formData.maxGuests,
      url: newLink,
      createdAt: new Date().toLocaleString('ko-KR', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    };
    
    setLinks(prev => [newLinkData, ...prev]);
    setGeneratedLink(newLink);
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

  const deleteLink = async (id: string) => {
    if (confirm('DELETE THIS LINK?')) {
      setLoadingStates(prev => ({ ...prev, [`delete_${id}`]: true }));
      await new Promise(resolve => setTimeout(resolve, 100));
      setLinks(prev => prev.filter(link => link.id !== id));
      setLoadingStates(prev => ({ ...prev, [`delete_${id}`]: false }));
    }
  };

  const formatDateDisplay = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
  };

  const filteredLinks = links.filter(link => link.date === selectedDate);

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
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <div className="lg:col-span-1 space-y-4">
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
              {filteredLinks.length}
            </div>
            <div className="text-gray-400 text-xs font-mono tracking-wider uppercase">
              TOTAL LINKS
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-px bg-gray-700">
            <div className="bg-gray-800 p-3 text-center">
              <div className="text-green-400 font-mono text-lg sm:text-xl tracking-wider">
                {filteredLinks.length}
              </div>
              <div className="text-gray-400 text-xs font-mono tracking-wider uppercase">
                ACTIVE
              </div>
            </div>
            <div className="bg-gray-800 p-3 text-center">
              <div className="text-gray-500 font-mono text-lg sm:text-xl tracking-wider">
                0
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
                <p className="text-gray-400 font-mono text-xs tracking-wider uppercase">GENERATE NEW GUEST CODE</p>
              </div>

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
                      DJ
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
                  <h3 className="font-mono text-sm tracking-wider text-white uppercase mb-2">GENERATED ACCESS CODE</h3>
                </div>
                
                <div className="bg-black border border-gray-700 p-4 mb-4">
                  <div className="font-mono text-sm tracking-widest text-white break-all">{generatedLink}</div>
                </div>
                
                <button
                  onClick={() => copyToClipboard(generatedLink)}
                  disabled={isCopying}
                  className="w-full bg-white text-black py-3 font-mono text-xs tracking-wider uppercase hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  {isCopying ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                      COPYING...
                    </div>
                  ) : (
                    'COPY CODE'
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'manage' && (
          <div className="bg-gray-900 border border-gray-700">
            <div className="border-b border-gray-700 p-4">
              <h3 className="font-mono text-xs sm:text-sm tracking-wider text-white uppercase">
                LINK LIST ({filteredLinks.length})
              </h3>
            </div>
            
            <div className="divide-y divide-gray-700 max-h-[500px] lg:max-h-[600px] overflow-y-auto">
              {filteredLinks.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-16 h-16 border border-gray-600 mx-auto mb-4 flex items-center justify-center">
                    <i className="ri-link text-gray-400 text-2xl"></i>
                  </div>
                  <p className="text-gray-400 font-mono text-sm tracking-wider uppercase">
                    NO LINKS FOUND FOR THIS DATE
                  </p>
                </div>
              ) : (
                filteredLinks.map((link, index) => (
                  <div key={link.id} className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 border border-gray-600 flex items-center justify-center">
                          <span className="text-xs font-mono text-gray-400">
                            {String(index + 1).padStart(2, '0')}
                          </span>
                        </div>
                        <div>
                          <p className="font-mono text-sm tracking-wider text-white uppercase">
                            {link.dj} - {link.event}
                          </p>
                          <p className="text-xs font-mono text-gray-400 mt-1">
                            MAX: {link.maxGuests} | CREATED: {link.createdAt}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-black border border-gray-700 p-3 mb-4">
                      <div className="mb-1">
                        <span className="font-mono text-xs tracking-wider text-gray-400 uppercase">ACCESS CODE</span>
                      </div>
                      <div className="font-mono text-sm tracking-widest text-white break-all">{link.url}</div>
                    </div>

                    <div className="grid grid-cols-2 gap-px bg-gray-700">
                      <button
                        onClick={() => copyToClipboard(link.url, link.id)}
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
                      <button
                        onClick={() => deleteLink(link.id)}
                        disabled={loadingStates[`delete_${link.id}`]}
                        className="bg-gray-900 border border-gray-600 text-gray-400 py-2 font-mono text-xs tracking-wider uppercase hover:bg-gray-800 transition-colors disabled:opacity-50"
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
          </div>
        )}
      </div>
    </div>
  );
}
