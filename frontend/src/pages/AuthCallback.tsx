import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import axios from 'axios';

const AuthCallback = () => {
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
                toast.error('Authentication failed');
                navigate('/login');
                return;
            }

            if (!token) {
                toast.error('No token received');
                navigate('/login');
                return;
            }

            try {
                // Fetch user details using the token
                const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/auth/me`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                const user = response.data.data.user;

                // Restrict Admin/SuperAdmin from using Member Login via OAuth
                if (['Admin', 'SuperAdmin'].includes(user.role)) {
                    toast.error('Admin accounts must use the Admin Console.');
                    navigate('/admin/login');
                    return;
                }

                login(user, token);
                toast.success(`Welcome back, ${user.name}!`);
                navigate('/dashboard');
            } catch (err) {
                console.error('Failed to verify token', err);
                toast.error('Authentication failed');
                navigate('/login');
            }
        };

        handleCallback();
    }, [searchParams, navigate, login]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#050508]">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
    );
};

export default AuthCallback;
