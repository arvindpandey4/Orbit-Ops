import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Logo } from '../components/Logo';
import { Mail, Lock, User, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';

const Register = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/register`, {
                name,
                email,
                password,
            });

            toast.success('Account created! Please ask an admin to activate it.');
            navigate('/login');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Registration failed');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#050508] font-inter">
            {/* Dynamic Background matching Login */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-white/5 rounded-full opacity-30" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-white/5 rounded-full opacity-40" />

                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
                >
                    <div className="absolute -top-2 left-1/2 w-4 h-4 bg-indigo-500 rounded-full blur-[2px] shadow-[0_0_20px_rgba(99,102,241,0.5)]" />
                </motion.div>

                <motion.div
                    animate={{ rotate: -360 }}
                    transition={{ duration: 45, repeat: Infinity, ease: "linear" }}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full"
                >
                    <div className="absolute top-1/2 -right-2 w-3 h-3 bg-purple-500 rounded-full blur-[2px] shadow-[0_0_20px_rgba(168,85,247,0.5)]" />
                </motion.div>

                <div className="absolute top-0 left-0 w-full h-full bg-gradient-radial from-indigo-900/10 to-transparent opacity-50" />
            </div>

            <div className="w-full max-w-md relative z-10 px-6">
                <motion.div
                    initial={{ opacity: 0, y: 30, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="bg-black/40 backdrop-blur-2xl border border-white/10 p-8 rounded-3xl shadow-2xl relative group overflow-hidden"
                >
                    <div className="absolute -inset-full top-0 block h-full w-1/2 -skew-x-12 bg-gradient-to-r from-transparent to-white opacity-5 group-hover:animate-shine" />

                    <div className="text-center mb-10">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                            className="inline-block mb-6 shadow-lg shadow-indigo-500/25 rounded-2xl"
                        >
                            <Logo size="lg" />
                        </motion.div>
                        <h1 className="text-3xl font-bold text-white mb-2 font-display bg-clip-text text-transparent bg-gradient-to-br from-white to-white/70">
                            Join OrbitOps
                        </h1>
                        <p className="text-slate-400 text-sm tracking-wide uppercase font-medium">Initialize New Command</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
                        <Input
                            type="text"
                            placeholder="Full Name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            leftIcon={<User size={18} className="text-indigo-400" />}
                            required
                            autoComplete="name"
                            className="bg-white/5 border-white/10 focus:border-indigo-500/50 focus:bg-white/10 transition-all font-medium"
                        />

                        <Input
                            type="email"
                            placeholder="Email address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            leftIcon={<Mail size={18} className="text-indigo-400" />}
                            required
                            autoComplete="email"
                            className="bg-white/5 border-white/10 focus:border-indigo-500/50 focus:bg-white/10 transition-all font-medium"
                        />

                        <Input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            leftIcon={<Lock size={18} className="text-indigo-400" />}
                            required
                            autoComplete="new-password"
                            className="bg-white/5 border-white/10 focus:border-indigo-500/50 focus:bg-white/10 transition-all font-medium"
                        />

                        <Button
                            type="submit"
                            className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold py-3 shadow-lg shadow-indigo-500/20 mt-2"
                            size="lg"
                            isLoading={isLoading}
                            rightIcon={<ArrowRight size={18} />}
                        >
                            Deploy Workspace
                        </Button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-white/5 text-center relative z-10">
                        <p className="text-sm text-slate-500">
                            Already have credentials?{' '}
                            <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-medium hover:underline decoration-indigo-500/30 underline-offset-4">
                                Access Terminal
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
            </div >
        </div >
    );
};

export default Register;
