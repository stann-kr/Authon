export interface User {
  id: string;
  email: string;
  name: string;
  role: 'DJ' | 'Door' | 'Admin';
  guest_limit: number;
}

interface LocalUser extends User {
  password: string;
  is_active: boolean;
}

const LOCAL_USERS_CACHE_KEY = 'local_users_cache';
let cachedLocalUsers: LocalUser[] | null = null;

export const clearLocalUsersCache = () => {
  cachedLocalUsers = null;
  if (typeof window === 'undefined') return;
  localStorage.removeItem(LOCAL_USERS_CACHE_KEY);
};

const loadLocalUsers = async (): Promise<LocalUser[]> => {
  if (cachedLocalUsers) return cachedLocalUsers;
  if (typeof window === 'undefined') return [];

  try {
    const cached = localStorage.getItem(LOCAL_USERS_CACHE_KEY);
    if (cached) {
      cachedLocalUsers = JSON.parse(cached) as LocalUser[];
      return cachedLocalUsers;
    }

    const response = await fetch('/local-users.json', { cache: 'no-store' });
    if (!response.ok) return [];

    const data = (await response.json()) as LocalUser[];
    if (Array.isArray(data)) {
      cachedLocalUsers = data;
      localStorage.setItem(LOCAL_USERS_CACHE_KEY, JSON.stringify(data));
      return cachedLocalUsers;
    }

    return [];
  } catch {
    return [];
  }
};

export const login = async (email: string, password: string): Promise<{ success: boolean; message?: string }> => {
  try {
    // 로컬 계정 검증
    const users = await loadLocalUsers();
    if (users.length === 0) {
      return { success: false, message: '로컬 사용자 파일을 찾을 수 없습니다. public/local-users.json을 생성해주세요.' };
    }
    const user = users.find(u => u.email === email && u.password === password);

    if (!user) {
      return { success: false, message: '이메일 또는 비밀번호가 잘못되었습니다.' };
    }

    if (!user.is_active) {
      return { success: false, message: '비활성화된 계정입니다.' };
    }

    // 사용자 정보 저장 (비밀번호 제외)
    const userInfo = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      guest_limit: user.guest_limit
    };

    localStorage.setItem('user', JSON.stringify(userInfo));
    return { success: true };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, message: '로그인 중 오류가 발생했습니다.' };
  }
};

export const logout = () => {
  clearLocalUsersCache();
  localStorage.removeItem('user');
  window.location.href = '/auth/login';
};

export const getUser = (): User | null => {
  if (typeof window === 'undefined') return null;
  
  const userStr = localStorage.getItem('user');
  if (!userStr) return null;
  
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
};

export const hasAccess = (userRole: string, requiredAccess: string[]): boolean => {
  const accessMap: Record<string, string[]> = {
    'DJ': ['guest'],
    'Door': ['guest', 'door'],
    'Admin': ['guest', 'door', 'admin']
  };
  
  return requiredAccess.some(access => accessMap[userRole]?.includes(access));
};
