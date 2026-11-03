import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { User, UserRole, AuthState } from '@/types/auth';

export const PRESET_GOVERNMENT_USERS: Record<string, User> = {
  dr_bezabih: {
    id: 1,
    user_id: 1,
    employee_number: 'EMP-001',
    first_name: 'Bezabih',
    last_name: 'Alemu',
    full_name: 'Dr. Bezabih Alemu',
    username: 'dr_bezabih',
    email: 'bezabih.alemu@hzsitd.gov.et',
    role: 'Department Head',
    position_title: 'Head of Department',
    directory_id: 1,
    directory_name: 'Executive Office',
    account_status: 'active',
    avatar_url: '/assets/images/profile/user-1.jpg',
    signature_url: 'https://api.iconify.design/lucide:pen-tool.svg',
    stamp_url: 'https://api.iconify.design/lucide:shield-check.svg'
  },
  eng_yohannes: {
    id: 2,
    user_id: 2,
    employee_number: 'EMP-002',
    first_name: 'Yohannes',
    last_name: 'Haile',
    full_name: 'Eng. Yohannes Haile',
    username: 'eng_yohannes',
    email: 'yohannes.haile@hzsitd.gov.et',
    role: 'Directory Lead',
    position_title: 'Director, Software Development & Systems',
    directory_id: 2,
    directory_name: 'Software Development & Systems Directorate',
    account_status: 'active',
    avatar_url: '/assets/images/profile/user-2.jpg'
  },
  almaz_t: {
    id: 4,
    user_id: 4,
    employee_number: 'EMP-004',
    first_name: 'Almaz',
    last_name: 'Tesfaye',
    full_name: 'Almaz Tesfaye',
    username: 'almaz_t',
    email: 'almaz.tesfaye@hzsitd.gov.et',
    role: 'Officer',
    position_title: 'Senior Systems Analysis Officer',
    directory_id: 2,
    directory_name: 'Software Development & Systems Directorate',
    account_status: 'active',
    avatar_url: '/assets/images/profile/user-3.jpg'
  },
  admin_solomon: {
    id: 8,
    user_id: 8,
    employee_number: 'EMP-008',
    first_name: 'Solomon',
    last_name: 'Bekele',
    full_name: 'Solomon Bekele',
    username: 'admin_solomon',
    email: 'solomon.bekele@hzsitd.gov.et',
    role: 'System Admin',
    position_title: 'Lead IT Systems Administrator',
    directory_id: 1,
    directory_name: 'Executive Office',
    account_status: 'active',
    avatar_url: '/assets/images/profile/user-4.jpg'
  }
};

const getInitialToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('hzsitd_token');
  }
  return null;
};

const getInitialRefreshToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('hzsitd_refresh_token');
  }
  return null;
};

const getInitialUser = (): User | null => {
  if (typeof window !== 'undefined') {
    const rawUser = localStorage.getItem('hzsitd_user');
    if (rawUser) {
      try {
        return JSON.parse(rawUser);
      } catch (e) {
        return null;
      }
    }
  }
  return null;
};

const initialToken = getInitialToken();
const initialUser = getInitialUser();

const initialState: AuthState = {
  token: initialToken,
  refreshToken: getInitialRefreshToken(),
  user: initialUser,
  isAuthenticated: Boolean(initialToken && initialUser),
  activeRole: initialUser?.role || 'Officer',
  activeDirectoryId: initialUser?.directory_id || 1
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ user: User; token: string; refreshToken?: string }>
    ) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      if (action.payload.refreshToken) {
        state.refreshToken = action.payload.refreshToken;
      }
      state.activeRole = action.payload.user.role;
      state.activeDirectoryId = action.payload.user.directory_id;
      state.isAuthenticated = true;
      if (typeof window !== 'undefined') {
        localStorage.setItem('hzsitd_token', action.payload.token);
        localStorage.setItem('hzsitd_user', JSON.stringify(action.payload.user));
        if (action.payload.refreshToken) {
          localStorage.setItem('hzsitd_refresh_token', action.payload.refreshToken);
        }
      }
    },
    updateUserProfile: (
      state,
      action: PayloadAction<Partial<User>>
    ) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
        if (typeof window !== 'undefined') {
          localStorage.setItem('hzsitd_user', JSON.stringify(state.user));
        }
      }
    },
    setActiveDirectoryId: (state, action: PayloadAction<number>) => {
      state.activeDirectoryId = action.payload;
    },
    switchPresetUser: (state, action: PayloadAction<keyof typeof PRESET_GOVERNMENT_USERS>) => {
      const preset = PRESET_GOVERNMENT_USERS[action.payload];
      if (preset) {
        state.user = preset;
        state.token = `mock-token-${preset.username}`;
        state.activeRole = preset.role;
        state.activeDirectoryId = preset.directory_id;
        state.isAuthenticated = true;
        if (typeof window !== 'undefined') {
          localStorage.setItem('hzsitd_token', state.token);
          localStorage.setItem('hzsitd_user', JSON.stringify(preset));
        }
      }
    },
    setActiveRole: (state, action: PayloadAction<UserRole>) => {
      state.activeRole = action.payload;
      if (state.user) {
        state.user.role = action.payload;
        if (typeof window !== 'undefined') {
          localStorage.setItem('hzsitd_user', JSON.stringify(state.user));
        }
      }
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      if (typeof window !== 'undefined') {
        localStorage.removeItem('hzsitd_token');
        localStorage.removeItem('hzsitd_user');
        localStorage.removeItem('hzsitd_refresh_token');
      }
    }
  }
});

export const {
  setCredentials,
  updateUserProfile,
  setActiveDirectoryId,
  switchPresetUser,
  setActiveRole,
  logout
} = authSlice.actions;

export default authSlice.reducer;
