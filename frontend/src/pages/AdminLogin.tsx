import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Logo } from '../components/Logo';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';

const AdminLogin = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [searchParams] = useSearchParams();

    const login = useAuthStore((state) => state.login);
    const navigate = useNavigate();

    useEffect(() => {
        const error = searchParams.get('error');
        if (error === 'insufficient_permissions') {
            toast.error('Access Denied. This account does not have Admin privileges.');
        } else if (error === 'pending_approval') {
            toast.error('Your account is pending approval from Super Admin.');
        }
    }, [searchParams]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/login`, {
                email,
                password,
            });

            const { user, accessToken } = response.data.data;

            if (!['Admin', 'SuperAdmin'].includes(user.role)) {
                toast.error('Access Denied. Admin privileges required.');
                setIsLoading(false);
                return;
            }

            login(user, accessToken);
            toast.success(`Welcome back, Admin ${user.name}!`);
            navigate('/dashboard');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Login failed');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#050508] font-inter">
            {/* Dynamic Background - Red/Orange for Admin */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-red-500/10 rounded-full opacity-30" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-red-500/10 rounded-full opacity-40" />

                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
                >
                    <div className="absolute -top-2 left-1/2 w-4 h-4 bg-red-500 rounded-full blur-[2px] shadow-[0_0_20px_rgba(239,68,68,0.5)]" />
                </motion.div>

                <div className="absolute top-0 left-0 w-full h-full bg-gradient-radial from-red-900/10 to-transparent opacity-50" />
            </div>

            <div className="w-full max-w-md relative z-10 px-6">
                <motion.div
                    initial={{ opacity: 0, y: 30, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="bg-black/40 backdrop-blur-2xl border border-red-500/20 p-8 rounded-3xl shadow-2xl relative group overflow-hidden"
                >
                    <div className="text-center mb-10">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                            className="inline-block mb-6 rounded-2xl shadow-lg shadow-red-500/25"
                        >
                            <Logo size="lg" />
                        </motion.div>
                        <h1 className="text-3xl font-bold text-white mb-2 font-display bg-clip-text text-transparent bg-gradient-to-br from-white to-white/70">
                            Admin Access
                        </h1>
                        <p className="text-slate-400 text-sm tracking-wide uppercase font-medium">System Administration</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                        <div className="space-y-4">
                            <Input
                                type="email"
                                placeholder="Admin Email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                leftIcon={<Mail size={18} className="text-red-400" />}
                                required
                                autoComplete="email"
                                className="bg-white/5 border border-white/20 focus:border-red-500/50 focus:bg-white/10 transition-all font-medium placeholder:text-slate-500"
                            />

                            <div className="space-y-2">
                                <Input
                                    type="password"
                                    placeholder="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    leftIcon={<Lock size={18} className="text-red-400" />}
                                    required
                                    autoComplete="current-password"
                                    className="bg-white/5 border border-white/20 focus:border-red-500/50 focus:bg-white/10 transition-all font-medium placeholder:text-slate-500"
                                />
                                <div className="flex justify-end">
                                    <Link to="/forgot-password" className="text-xs text-slate-400 hover:text-red-400 transition-colors font-medium">
                                        Forgot admin credentials?
                                    </Link>
                                </div>
                            </div>
                        </div>

                        <Button
                            type="submit"
                            className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-semibold py-3 shadow-lg shadow-red-500/20 border border-white/10"
                            size="lg"
                            isLoading={isLoading}
                            rightIcon={<ArrowRight size={18} />}
                        >
                            Authenticate
                        </Button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-white/5">
                        <Button
                            variant="outline"
                            className="w-full mb-6 border-red-500/20 hover:bg-red-500/5 text-slate-300 hover:text-white"
                            onClick={() => window.location.href = `${import.meta.env.VITE_API_URL}/api/auth/google?adminIntent=true`}
                        >
                            Sign in with Google (Admin)
                        </Button>

                        <p className="text-center text-sm text-slate-500">
                            Need an admin account?{' '}
                            <Link to="/admin/register" className="text-red-400 hover:text-red-300 font-medium hover:underline decoration-red-500/30 underline-offset-4">
                                Register as Admin
                            </Link>
                        </p>
                        <p className="text-center text-xs text-slate-600 mt-4">
                            <Link to="/login" className="hover:text-slate-400 transition-colors">
                                Return to Member Login
                            </Link>
                        </p>
                    </div>
                </motion.div>

                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-center text-xs text-slate-600 mt-8"
                >
                    Made with ❤️ by Arvind Pandey | © 2026 OrbitOps
                </motion.p>
            </div>
        </div>
    );
};

export default AdminLogin;
