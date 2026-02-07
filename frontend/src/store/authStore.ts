import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '../types';
import axios from 'axios';

interface AuthState {
    user: User | null;
    accessToken: string | null;
    token: string | null; // Alias for accessToken
    isAuthenticated: boolean;
    login: (user: User, accessToken: string) => void;
    logout: () => void;
    updateUser: (user: User) => void;
    setUser: (user: User) => void; // Alias for updateUser
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            accessToken: null,
            token: null,
            isAuthenticated: false,
            login: (user, accessToken) => set({ user, accessToken, token: accessToken, isAuthenticated: true }),
            logout: () => set({ user: null, accessToken: null, token: null, isAuthenticated: false }),
            updateUser: (user) => set({ user }),
            setUser: (user) => set({ user }), // Alias for updateUser
        }),
        {
            name: 'auth-storage',
        }
    )
);

// Axios interceptor to add token to requests
axios.interceptors.request.use((config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Axios interceptor to handle 401 errors
axios.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401) {
            useAuthStore.getState().logout();
        }
        return Promise.reject(error);
    }
);
