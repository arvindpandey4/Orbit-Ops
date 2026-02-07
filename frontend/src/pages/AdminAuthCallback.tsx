import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import axios from 'axios';

const AdminAuthCallback = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const login = useAuthStore((state) => state.login);
    const processed = useRef(false);

    useEffect(() => {
        const handleCallback = async () => {
            if (processed.current) return;
            processed.current = true;

            const token = searchParams.get('token');
            const error = searchParams.get('error');

            if (error) {
                if (error === 'insufficient_permissions') {
                    toast.error('Access Denied. Admin privileges required.');
                } else {
                    toast.error('Authentication failed');
                }
                navigate('/admin/login');
                return;
            }

            if (!token) {
                toast.error('No token received');
                navigate('/admin/login');
                return;
            }

            try {
                // Fetch user details using the token
                const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/auth/me`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                const user = response.data.data.user;

                // Verify user has Admin role
                if (user.role !== 'Admin') {
                    toast.error('Access Denied. Admin privileges required.');
                    navigate('/admin/login');
                    return;
                }

                login(user, token);
                toast.success(`Welcome back, Admin ${user.name}!`);
                navigate('/dashboard');
            } catch (err) {
                console.error('Failed to verify token', err);
                toast.error('Authentication failed');
                navigate('/admin/login');
            }
        };

        handleCallback();
    }, [searchParams, navigate, login]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#050508]">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500 mx-auto mb-4"></div>
                <p className="text-slate-400 text-sm">Verifying admin credentials...</p>
            </div>
        </div>
    );
};

export default AdminAuthCallback;
