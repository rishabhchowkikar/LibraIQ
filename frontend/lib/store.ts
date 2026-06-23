import axios from 'axios';
import { create } from 'zustand'
import { persist } from "zustand/middleware"

export type UserRole = 'STUDENT' | 'ADMIN';
export type TrustTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM'

export interface User {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    trustTier: TrustTier;
}

interface AuthState {
    user: User | null;
    accessToken: string | null;
    isAuthenticated: boolean;
    _hasHydrated: boolean;
    _isRestoring: boolean;
    setHasHydrated: (state: boolean) => void;
    setAuth: (user: User, token: string) => void;
    logout: () => Promise<void>;
    restoreSession: () => Promise<boolean>;
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

function clearFrontendCookies() {
    if (typeof document === 'undefined') return;
    document.cookie = 'isLoggedIn=; path=/; max-age=0';
    document.cookie = 'userRole=; path=/; max-age=0';
}

function setFrontendCookies(role: string) {
    if (typeof document === 'undefined') return;
    const maxAge = 7 * 24 * 60 * 60;
    const isSecure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `isLoggedIn=true; path=/; max-age=${maxAge}; SameSite=Lax${isSecure}`;
    document.cookie = `userRole=${role}; path=/; max-age=${maxAge}; SameSite=Lax${isSecure}`;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            accessToken: null,
            isAuthenticated: false,
            _hasHydrated: false,
            _isRestoring: false,
            setHasHydrated: (state) => set({ _hasHydrated: state }),
            setAuth: (user, token) => {
                localStorage.setItem('accessToken', token);
                setFrontendCookies(user.role);
                set({ user, accessToken: token, isAuthenticated: true });
            },
            logout: async () => {
                try {
                    await axios.post(`${BASE_URL}/auth/logout`,
                        {},
                        { withCredentials: true }
                    );
                } catch (error) {

                }
                localStorage.removeItem('accessToken');
                clearFrontendCookies();
                set({ user: null, accessToken: null, isAuthenticated: false });
            },
            restoreSession: async () => {
                set({ _isRestoring: true });
                try {
                    const { data: refreshData } = await axios.post(
                        `${BASE_URL}/auth/refresh`,
                        {},
                        { withCredentials: true }
                    );

                    if (!refreshData.success || !refreshData.accessToken) throw new Error('refresh failed');

                    const { data: meData } = await axios.get(
                        `${BASE_URL}/auth/me`,
                        { headers: { Authorization: `Bearer ${refreshData.accessToken}` }, withCredentials: true }
                    );

                    if (!meData.success || !meData.user) throw new Error('me failed');

                    get().setAuth(meData.user, refreshData.accessToken);
                    set({ _isRestoring: false });
                    return true;
                } catch {
                    try {
                        await axios.post(`${BASE_URL}/auth/logout`, {}, { withCredentials: true });
                    } catch { /* ignore */ }
                    clearFrontendCookies();
                    set({ _isRestoring: false });
                    return false;
                }
            },
        }),
        {
            name: 'auth-storage',
            // Only persist the data fields, not transient flags or functions
            partialize: (state) => ({
                user: state.user,
                accessToken: state.accessToken,
                isAuthenticated: state.isAuthenticated,
            }),
            onRehydrateStorage: () => (state) => {
                state?.setHasHydrated(true);
            },
        }
    )
)
