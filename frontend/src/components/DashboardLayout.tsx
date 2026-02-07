import { ReactNode, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Activity,
    FolderKanban,
    Users,
    Settings,
    LogOut,
    Bell,
    Search,
    CheckSquare,
    Mail,
    Menu,
    X
} from 'lucide-react';
import { Button } from './Button';
import { Logo } from './Logo';

interface LayoutProps {
    children: ReactNode;
}

export const DashboardLayout = ({ children }: LayoutProps) => {
    const { user, logout } = useAuthStore();
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Close mobile menu on route change
    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [location.pathname]);

    const navItems = [
        { icon: <LayoutDashboard size={20} />, label: 'Command Center', path: '/dashboard' },
        { icon: <FolderKanban size={20} />, label: 'Projects', path: '/projects' },
        { icon: <CheckSquare size={20} />, label: 'Tasks', path: '/tasks' },
        { icon: <Users size={20} />, label: 'Team', path: '/team' },
        { icon: <Settings size={20} />, label: 'System', path: '/settings' },
    ];

    const SidebarContent = () => (
        <div className="p-6 flex flex-col h-full bg-[#050508]/95 backdrop-blur-2xl border-r border-white/5">
            {/* Logo */}
            <div className="flex items-center justify-between mb-8 px-4">
                <Link to="/dashboard" className="block">
                    <div className="flex items-center gap-3 group cursor-pointer">
                        <Logo className="shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-shadow" size="md" />
                        <div>
                            <h1 className="text-lg md:text-xl font-bold text-white">OrbitOps</h1>
                            <p className="text-[10px] md:text-xs text-slate-500 uppercase tracking-wider">System Active</p>
                        </div>
                    </div>
                </Link>
                {/* Close Button Mobile */}
                <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="md:hidden text-slate-400 hover:text-white"
                >
                    <X size={24} />
                </button>
            </div>

            <nav className="space-y-1.5 flex-1">
                {navItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                        <Link key={item.path} to={item.path}>
                            <div
                                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl transition-colors duration-200
                  ${isActive
                                        ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                                        : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                            >
                                <div className={isActive ? 'text-indigo-400' : 'text-slate-500'}>
                                    {item.icon}
                                </div>
                                <span className="font-medium text-sm">{item.label}</span>
                                {isActive && (
                                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400" />
                                )}
                            </div>
                        </Link>
                    );
                })}
            </nav>

            <div className="mt-auto">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 mb-4 group hover:border-white/10 transition-colors">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center">
                            <Users size={20} className="text-white" />
                        </div>
                        <div className="overflow-hidden">
                            <h4 className="font-semibold text-sm text-white group-hover:text-indigo-300 transition-colors truncate">{user?.name}</h4>
                            <p className="text-xs text-slate-500 capitalize truncate">
                                {user?.role === 'SuperAdmin' ? 'Super Admin' : user?.role} Officer
                            </p>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-500/10 h-9"
                        onClick={logout}
                        leftIcon={<LogOut size={16} />}
                    >
                        Terminate Session
                    </Button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen flex bg-[#050508] text-white selection:bg-indigo-500/30 font-inter">
            {/* Desktop Sidebar */}
            <aside className="w-72 fixed h-screen z-30 hidden md:block">
                <SidebarContent />
            </aside>

            {/* Mobile Sidebar Overlay & Drawer */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
                        />
                        <motion.aside
                            initial={{ x: -280 }}
                            animate={{ x: 0 }}
                            exit={{ x: -280 }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className="fixed inset-y-0 left-0 w-72 z-50 md:hidden h-screen"
                        >
                            <SidebarContent />
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            {/* Main Content */}
            <main className="flex-1 md:ml-72 relative w-full">
                {/* Header Background */}
                <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-indigo-900/10 to-transparent pointer-events-none" />

                <header className="h-16 md:h-20 sticky top-0 z-20 border-b border-white/5 bg-[#050508]/80 backdrop-blur-xl px-4 md:px-8 flex items-center justify-between gap-4">
                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setIsMobileMenuOpen(true)}
                        className="md:hidden p-2 -ml-2 text-slate-400 hover:text-white"
                    >
                        <Menu size={24} />
                    </button>

                    <div className="flex items-center gap-4 flex-1 max-w-xl">
                        <div className="relative w-full group hidden md:block">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={18} />
                            <input
                                type="text"
                                placeholder="Search queries..."
                                className="w-full bg-slate-900/50 border border-white/5 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all placeholder:text-slate-600 text-slate-300"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-3 md:gap-4">
                        <div className="relative group">
                            <button className="relative p-2 md:p-2.5 rounded-xl hover:bg-white/5 text-slate-400 hover:text-white transition-colors border border-transparent hover:border-white/5">
                                <Bell size={20} />
                                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                            </button>

                            {/* Notification Dropdown */}
                            <div className="absolute right-0 top-full mt-2 w-72 md:w-80 bg-[#050508] border border-white/10 rounded-xl shadow-2xl overflow-hidden invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all z-50 transform origin-top-right">
                                <div className="p-4 border-b border-white/5">
                                    <h4 className="font-semibold text-white">Notifications</h4>
                                </div>
                                <div className="max-h-64 overflow-y-auto">
                                    <div className="p-4 hover:bg-white/5 transition-colors cursor-pointer border-b border-white/5 last:border-0">
                                        <div className="flex gap-3">
                                            <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center text-green-400 shrink-0">
                                                <Mail size={14} />
                                            </div>
                                            <div>
                                                <p className="text-sm text-slate-300">Welcome to OrbitOps! 🚀</p>
                                                <p className="text-xs text-slate-500 mt-1">Check your inbox for the welcome guide.</p>
                                                <p className="text-[10px] text-slate-600 mt-2">{new Date(user?.createdAt || Date.now()).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                    </div>
                                    {/* Additional mock notification */}
                                    <div className="p-4 hover:bg-white/5 transition-colors cursor-pointer">
                                        <div className="flex gap-3">
                                            <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 shrink-0">
                                                <Activity size={14} />
                                            </div>
                                            <div>
                                                <p className="text-sm text-slate-300">System Ready</p>
                                                <p className="text-xs text-slate-500 mt-1">All systems are operational.</p>
                                                <p className="text-[10px] text-slate-600 mt-2">Just now</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="p-4 md:p-8 relative z-0">
                    {children}
                </div>
            </main>
        </div>
    );
};
