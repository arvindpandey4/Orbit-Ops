import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { useAuthStore } from '../store/authStore';
import { useSocketStore } from '../store/socketStore';
import toast from 'react-hot-toast';
import {
    Activity,
    Clock,
    AlertCircle,
    Plus,
    Calendar,
    Layers,
    ArrowUpRight
} from 'lucide-react';
import { StaggerContainer, FadeIn, ScaleIn } from '../components/Animations';
import axios from 'axios';
import { Task } from '../types';

const Dashboard = () => {
    const { user, token } = useAuthStore();
    const { socket } = useSocketStore();
    const navigate = useNavigate();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [stats, setStats] = useState({
        todo: 0,
        inProgress: 0,
        done: 0,
        overdue: 0,
        total: 0
    });
    const [isDemoMode, setIsDemoMode] = useState(false);

    const fetchDashboardData = async () => {
        if (!token) return;
        try {
            // Fetch Tasks
            const tasksRes = await axios.get(
                `${import.meta.env.VITE_API_URL}/api/tasks/my-tasks?limit=5`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const tasksData = Array.isArray(tasksRes.data.data) ? tasksRes.data.data : (tasksRes.data.data?.tasks || []);
            setTasks(tasksData);

            // Fetch Stats
            const statsRes = await axios.get(
                `${import.meta.env.VITE_API_URL}/api/tasks/stats/me`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const statsData = statsRes.data.data.stats;

            if (statsData.total === 0 && tasksData.length === 0) {
                // Demo Mode
                if (!isDemoMode) {
                    setIsDemoMode(true);
                    setStats({
                        todo: 12,
                        inProgress: 5,
                        done: 20,
                        overdue: 3,
                        total: 40
                    });
                    toast('Running in Demo Mode: Real data will appear when available.', {
                        icon: 'ℹ️',
                        style: {
                            background: '#334155',
                            color: '#fff',
                        }
                    });
                }
            } else {
                // Real Data Mode
                setIsDemoMode(false);
                setStats(statsData);
            }

        } catch (error) {
            console.error('Failed to fetch dashboard data', error);
            // Fallback to demo on error
            setStats({
                todo: 12,
                inProgress: 5,
                done: 20,
                overdue: 3,
                total: 40
            });
            setIsDemoMode(true);
        }
    };

    // Initial Fetch & Socket Setup
    useEffect(() => {
        fetchDashboardData();

        if (socket && token) {
            // Join Project Rooms (Naive approach: fetch all my projects)
            const joinRooms = async () => {
                try {
                    const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/projects`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    const projects = Array.isArray(res.data.data) ? res.data.data : (res.data.data?.projects || []);
                    projects.forEach((p: any) => socket.emit('join-project', { projectId: p._id }));
                } catch (e) { console.error("Failed to join rooms", e); }
            };
            joinRooms();

            const handleUpdate = () => {
                // Determine if we need to show a "Realtime Update" toast?
                // Maybe too noisy. Just refresh data.
                fetchDashboardData();
            };

            socket.on('task:created', handleUpdate);
            socket.on('task:updated', handleUpdate);
            socket.on('task:deleted', handleUpdate);
            socket.on('task:status-changed', handleUpdate);

            return () => {
                socket.off('task:created', handleUpdate);
                socket.off('task:updated', handleUpdate);
                socket.off('task:deleted', handleUpdate);
                socket.off('task:status-changed', handleUpdate);
            };
        }
    }, [token, socket]);

    const totalTasks = stats.total || (stats.todo + stats.inProgress + stats.done + stats.overdue);

    const statCards = [
        { label: 'Total Operations', value: totalTasks, icon: <Layers className="text-blue-400" size={24} />, color: 'from-blue-500/20 to-blue-600/5', borderColor: 'border-blue-500/20', textColor: 'text-blue-400' },
        { label: 'Active Missions', value: stats.inProgress, icon: <Activity className="text-purple-400" size={24} />, color: 'from-purple-500/20 to-purple-600/5', borderColor: 'border-purple-500/20', textColor: 'text-purple-400' },
        { label: 'Pending Review', value: stats.todo, icon: <Clock className="text-orange-400" size={24} />, color: 'from-orange-500/20 to-orange-600/5', borderColor: 'border-orange-500/20', textColor: 'text-orange-400' },
        { label: 'Critical Alerts', value: stats.overdue, icon: <AlertCircle className="text-red-400" size={24} />, color: 'from-red-500/20 to-red-600/5', borderColor: 'border-red-500/20', textColor: 'text-red-400' },
    ];

    // Derive Live Feed from Tasks (Real) or Mock (Demo)
    const feedItems = isDemoMode || tasks.length === 0 ? [1, 2, 3, 4].map(i => ({
        id: i,
        user: 'Agent Smith',
        action: 'deployed update',
        target: 'V1.2.0 Release Candidate',
        time: '14:32:01'
    })) : tasks.map(t => ({
        id: t._id,
        user: typeof t.createdBy === 'object' ? t.createdBy.name : 'Unknown Agent',
        action: 'created task',
        target: t.title,
        time: new Date(t.createdAt).toLocaleTimeString()
    }));

    return (
        <div className="space-y-8 font-inter">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold mb-1 text-white font-display">Command Center</h1>
                    <p className="text-slate-400">
                        {user?.role === 'SuperAdmin'
                            ? `Welcome, Super Admin`
                            : `Welcome back, Commander ${user?.name}. System ready.`}
                    </p>
                </div>
                <Button leftIcon={<Plus size={18} />} className="shadow-lg shadow-indigo-500/20 w-full md:w-auto" onClick={() => navigate('/projects')}>View Projects</Button>
            </div>

            {/* Stats Grid */}
            <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {statCards.map((stat, index) => (
                    <ScaleIn key={index}>
                        <div className={`p-5 rounded-3xl bg-gradient-to-br ${stat.color} border ${stat.borderColor} relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300`}>
                            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                {stat.icon}
                            </div>
                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-4">
                                    <div className={`p-3 rounded-2xl bg-black/20 backdrop-blur-sm border ${stat.borderColor} ${stat.textColor}`}>
                                        {stat.icon}
                                    </div>
                                    <span className="flex items-center gap-1 text-[10px] font-semibold bg-white/5 px-2 py-1 rounded-full text-slate-300">
                                        {isDemoMode ? '+12%' : '+Live'} <ArrowUpRight size={10} />
                                    </span>
                                </div>
                                <h3 className="text-3xl font-bold text-white mb-1 font-display tracking-tight">{stat.value}</h3>
                                <p className="text-slate-400 text-sm font-medium">{stat.label}</p>
                            </div>
                        </div>
                    </ScaleIn>
                ))}
            </StaggerContainer>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Recent Tasks */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-white">Recent Operations</h2>
                        <Button variant="ghost" size="sm" className="text-indigo-400 hover:text-indigo-300" onClick={() => navigate('/tasks')}>View All Missions</Button>
                    </div>

                    <StaggerContainer className="space-y-4">
                        {tasks.length > 0 && !isDemoMode ? tasks.map((task) => (
                            <FadeIn key={task._id}>
                                <Card className="group cursor-pointer border-white/5 hover:border-indigo-500/30 bg-[#0a0a0f]/50 backdrop-blur-sm transition-all duration-300">
                                    <div className="flex items-center gap-5 p-4">
                                        <div className={`w-3 h-3 rounded-full ${task.priority === 'High' ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]'}`} />
                                        <div className="flex-1">
                                            <h4 className="font-semibold text-white group-hover:text-indigo-400 transition-colors text-base">
                                                {task.title}
                                            </h4>
                                            <div className="flex items-center gap-4 mt-1.5 text-xs text-slate-500">
                                                <span className="flex items-center gap-1.5">
                                                    <Calendar size={12} /> {new Date(task.createdAt).toLocaleDateString()}
                                                </span>
                                                <span className={`px-2 py-0.5 rounded-full font-medium ${task.priority === 'High' ? 'bg-red-500/10 text-red-400' : 'bg-indigo-500/10 text-indigo-400'}`}>
                                                    {task.priority || 'Normal'} Priority
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-right min-w-[100px]">
                                            <div className="text-xs text-slate-400 font-medium mb-1.5 list-none">
                                                {task.assignedTo && task.assignedTo.length > 0
                                                    ? (typeof task.assignedTo[0] === 'object' ? (task.assignedTo[0] as any).name : 'Assigned')
                                                    : 'Unassigned'}
                                            </div>
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${task.status === 'Done' ? 'bg-green-500/10 text-green-400 border-green-500/20' : task.status === 'In Progress' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>
                                                {task.status}
                                            </span>
                                        </div>
                                    </div>
                                </Card>
                            </FadeIn>
                        )) : (
                            // Demo Tasks
                            [1, 2, 3].map((i) => (
                                <FadeIn key={i}>
                                    <Card className="group cursor-pointer border-white/5 hover:border-indigo-500/30 bg-[#0a0a0f]/50 backdrop-blur-sm transition-all duration-300">
                                        <div className="flex items-center gap-5 p-4">
                                            <div className="w-3 h-3 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                                            <div className="flex-1">
                                                <h4 className="font-semibold text-white group-hover:text-indigo-400 transition-colors text-base">
                                                    Deploy Server Infrastructure {i}
                                                </h4>
                                                <div className="flex items-center gap-4 mt-1.5 text-xs text-slate-500">
                                                    <span className="flex items-center gap-1.5">
                                                        <Calendar size={12} /> Today, 14:00
                                                    </span>
                                                    <span className="px-2 py-0.5 rounded-full font-medium bg-purple-500/10 text-purple-400">
                                                        Development
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                </FadeIn>
                            ))
                        )}
                    </StaggerContainer>
                </div>

                {/* Activity Feed */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-white">Live Feed</h2>
                    </div>

                    <div className="bg-[#0a0a0f]/50 backdrop-blur-sm border border-white/5 rounded-3xl p-5 h-[400px] relative overflow-hidden">

                        <div className="space-y-0 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-[1px] before:bg-gradient-to-b before:from-indigo-500/50 before:to-transparent">
                            {feedItems.map((item, i) => (
                                <div key={i} className="relative pl-10 pb-8 last:pb-0">
                                    <div className="absolute left-0 top-0.5 w-7 h-7 rounded-full bg-[#0a0a0f] border-2 border-indigo-500/30 flex items-center justify-center z-10 shadow-[0_0_10px_rgba(99,102,241,0.2)]">
                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-400 leading-relaxed">
                                            <span className="font-semibold text-white">{item.user}</span> {item.action}
                                            <span className="font-medium text-indigo-400 block mt-0.5">{item.target}</span>
                                        </p>
                                        <p className="text-[10px] text-slate-600 mt-1 font-mono">{item.time}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Fade out bottom */}
                        <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-[#0a0a0f] to-transparent pointer-events-none" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
