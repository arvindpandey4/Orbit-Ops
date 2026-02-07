import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from './authStore';

interface SocketState {
    socket: Socket | null;
    isConnected: boolean;
    onlineUsers: Record<string, string>;
    connect: () => void;
    disconnect: () => void;
}

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export const useSocketStore = create<SocketState>((set, get) => ({
    socket: null,
    isConnected: false,
    onlineUsers: {},
    connect: () => {
        const { accessToken } = useAuthStore.getState();
        if (!accessToken) return;

        const socket = io(SOCKET_URL, {
            auth: { token: accessToken },
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });

        socket.on('connect', () => {
            console.log('Socket connected');
            set({ isConnected: true });
        });

        socket.on('disconnect', () => {
            console.log('Socket disconnected');
            set({ isConnected: false });
        });

        socket.on('user:online', ({ userId }) => {
            set((state) => ({
                onlineUsers: { ...state.onlineUsers, [userId]: 'online' },
            }));
        });

        socket.on('user:offline', ({ userId }) => {
            set((state) => ({
                onlineUsers: { ...state.onlineUsers, [userId]: 'offline' },
            }));
        });

        set({ socket });
    },
    disconnect: () => {
        const { socket } = get();
        if (socket) {
            socket.disconnect();
            set({ socket: null, isConnected: false });
        }
    },
}));
