import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Logo } from '../components/Logo';
import { Mail, Lock, User, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';

const AdminRegister = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const [isPending, setIsPending] = useState(false);



    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/register`, {
                name,
                email,
                password,
                role: 'Admin' // Explicitly registering as Admin
            });

            // navigate('/admin/login'); // Old flow
            setIsPending(true); // New flow: Show pending screen
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Registration failed');
        } finally {
            setIsLoading(false);
        }
    };

    if (isPending) {
        return <PendingVerification />;
    }

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#050508] font-inter">
            {/* Dynamic Background */}
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
                            Create Admin Account
                        </h1>
                        <p className="text-slate-400 text-sm tracking-wide uppercase font-medium">Initialize Root Access</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                        <div className="space-y-4">
                            <Input
                                type="text"
                                placeholder="Full Name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                leftIcon={<User size={18} className="text-red-400" />}
                                required
                                autoComplete="name"
                                className="bg-white/5 border border-white/20 focus:border-red-500/50 focus:bg-white/10 transition-all font-medium placeholder:text-slate-500"
                            />

                            <Input
                                type="email"
                                placeholder="Email address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                leftIcon={<Mail size={18} className="text-red-400" />}
                                required
                                autoComplete="email"
                                className="bg-white/5 border border-white/20 focus:border-red-500/50 focus:bg-white/10 transition-all font-medium placeholder:text-slate-500"
                            />

                            <Input
                                type="password"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                leftIcon={<Lock size={18} className="text-red-400" />}
                                required
                                autoComplete="new-password"
                                className="bg-white/5 border border-white/20 focus:border-red-500/50 focus:bg-white/10 transition-all font-medium placeholder:text-slate-500"
                            />
                        </div>

                        <Button
                            type="submit"
                            className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-semibold py-3 shadow-lg shadow-red-500/20 border border-white/10"
                            size="lg"
                            isLoading={isLoading}
                            rightIcon={<ArrowRight size={18} />}
                        >
                            Establish Admin Credentials
                        </Button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-white/5">
                        <p className="text-center text-sm text-slate-500">
                            Already have admin access?{' '}
                            <Link to="/admin/login" className="text-red-400 hover:text-red-300 font-medium hover:underline decoration-red-500/30 underline-offset-4">
                                Sign In
                            </Link>
                        </p>
                        <p className="text-center text-xs text-slate-600 mt-4">
                            <Link to="/register" className="hover:text-slate-400 transition-colors">
                                Return to User Registration
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

const PendingVerification = () => (
    <div className="min-h-screen flex items-center justify-center bg-[#050508] font-inter">
        <div className="max-w-md w-full mx-auto p-8">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-black/40 backdrop-blur-2xl border border-yellow-500/20 p-8 rounded-3xl shadow-2xl text-center"
            >
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-500/10 text-yellow-500 mb-6 border border-yellow-500/20">
                    <Lock size={32} />
                </div>
                <h2 className="text-2xl font-bold text-white mb-4">Verification Pending</h2>
                <p className="text-slate-400 mb-8 leading-relaxed">
                    Your request for Admin access has been submitted safely.
                    <br /><br />
                    You will be able to log in once a Super Admin verifies and approves your credentials. You will receive an email upon approval.
                </p>
                <Link to="/admin/login">
                    <Button className="w-full bg-white/5 hover:bg-white/10 border border-white/10">
                        Return to Login
                    </Button>
                </Link>
            </motion.div>
        </div>
    </div>
);

export default AdminRegister;
