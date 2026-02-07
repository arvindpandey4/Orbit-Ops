import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Mail, ArrowRight, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSent, setIsSent] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/forgot-password`, { email });
            setIsSent(true);
            toast.success('Reset link sent to your email');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to send reset email');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#050508] font-inter">
            {/* Dynamic Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-white/5 rounded-full opacity-30" />
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full"
                >
                    <div className="absolute -top-2 left-1/2 w-3 h-3 bg-indigo-500 rounded-full blur-[2px]" />
                </motion.div>
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-radial from-indigo-900/10 to-transparent opacity-50" />
            </div>

            <div className="w-full max-w-md relative z-10 px-6">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-black/40 backdrop-blur-2xl border border-white/10 p-8 rounded-3xl shadow-2xl relative overflow-hidden"
                >
                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-bold text-white mb-2 font-display">Forgot Password</h1>
                        <p className="text-slate-400 text-sm">Enter your email to receive a reset link</p>
                    </div>

                    {!isSent ? (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <Input
                                type="email"
                                placeholder="Email address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                leftIcon={<Mail size={18} className="text-indigo-400" />}
                                required
                            />

                            <Button
                                type="submit"
                                className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500"
                                size="lg"
                                isLoading={isLoading}
                                rightIcon={<ArrowRight size={18} />}
                            >
                                Send Reset Link
                            </Button>
                        </form>
                    ) : (
                        <div className="text-center space-y-4">
                            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/20">
                                <Mail size={32} className="text-green-500" />
                            </div>
                            <p className="text-slate-300">
                                If an account exists for <b>{email}</b>, you will receive a password reset link shortly.
                            </p>
                            <Button
                                variant="outline"
                                onClick={() => setIsSent(false)}
                                className="mt-4"
                            >
                                Try another email
                            </Button>
                        </div>
                    )}

                    <div className="mt-8 pt-6 border-t border-white/5 text-center">
                        <Link to="/login" className="inline-flex items-center text-sm text-slate-500 hover:text-white transition-colors">
                            <ArrowLeft size={16} className="mr-2" /> Back to Login
                        </Link>
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

export default ForgotPassword;
