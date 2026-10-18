import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { User, UserRole, AuthState } from '@/types/auth';

// 4 Official Government Personas pre-configured for live development & testing
export const PRESET_GOVERNMENT_USERS: Record<string, User> = {
  dr_bezabih: {
    id: 1,
    full_name: 'Dr. Bezabih Alemu',
    username: 'dr_bezabih',
    email: 'bezabih.alemu@hzsitd.gov.et',
    role: 'Department Head',
    position_title: 'Head of Department',
    directory_id: 1,
    directory_name: 'Executive Office',
    avatar_url: '/assets/images/profile/user-1.jpg',
    signature_url: 'https://api.iconify.design/lucide:pen-tool.svg',
    stamp_url: 'https://api.iconify.design/lucide:shield-check.svg'
  },
  eng_yohannes: {
    id: 2,
    full_name: 'Eng. Yohannes Haile',
    username: 'eng_yohannes',
    email: 'yohannes.haile@hzsitd.gov.et',
    role: 'Directory Lead',
    position_title: 'Director, Software Development & Systems',
    directory_id: 2,
    directory_name: 'Software Development & Systems Directorate',
    avatar_url: '/assets/images/profile/user-2.jpg'
  },
  almaz_t: {
    id: 4,
    full_name: 'Almaz Tesfaye',
    username: 'almaz_t',
    email: 'almaz.tesfaye@hzsitd.gov.et',
    role: 'Officer',
    position_title: 'Senior Systems Analysis Officer',
    directory_id: 2,
    directory_name: 'Software Development & Systems Directorate',
    avatar_url: '/assets/images/profile/user-3.jpg'
  },
  admin_solomon: {
    id: 8,
    full_name: 'Solomon Bekele',
    username: 'admin_solomon',
    email: 'solomon.bekele@hzsitd.gov.et',
    role: 'System Admin',
    position_title: 'Lead IT Systems Administrator',
    directory_id: 1,
    directory_name: 'Executive Office',
    avatar_url: '/assets/images/profile/user-4.jpg'
  }
};

const initialState: AuthState = {
  token: typeof window !== 'undefined' ? localStorage.getItem('hzsitd_token') : null,
  user: PRESET_GOVERNMENT_USERS.dr_bezabih, // Default active user: Dr. Bezabih Alemu
  isAuthenticated: true,
  activeRole: 'Department Head'
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ user: User; token: string }>
    ) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.activeRole = action.payload.user.role;
      state.isAuthenticated = true;
      if (typeof window !== 'undefined') {
        localStorage.setItem('hzsitd_token', action.payload.token);
      }
    },
    switchPresetUser: (state, action: PayloadAction<keyof typeof PRESET_GOVERNMENT_USERS>) => {
      const preset = PRESET_GOVERNMENT_USERS[action.payload];
      if (preset) {
        state.user = preset;
        state.activeRole = preset.role;
        state.isAuthenticated = true;
      }
    },
    setActiveRole: (state, action: PayloadAction<UserRole>) => {
      state.activeRole = action.payload;
      if (state.user) {
        state.user.role = action.payload;
      }
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      if (typeof window !== 'undefined') {
        localStorage.removeItem('hzsitd_token');
      }
    }
  }
});

export const { setCredentials, switchPresetUser, setActiveRole, logout } = authSlice.actions;
export default authSlice.reducer;
