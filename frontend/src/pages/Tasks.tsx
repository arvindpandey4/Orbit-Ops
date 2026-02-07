import { useState, useEffect } from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Modal } from '../components/Modal';
import { StaggerContainer, FadeIn } from '../components/Animations';
import { Plus, Calendar, Trash2, Users, AlertTriangle } from 'lucide-react';
import { Task } from '../types';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';

const Tasks = () => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [projects, setProjects] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [newTask, setNewTask] = useState({
        title: '',
        description: '',
        status: 'Todo' as 'Todo' | 'In Progress' | 'Done',
        priority: 'Medium' as 'Low' | 'Medium' | 'High',
        project: '',
        startDate: '',
        dueDate: '',
        assignedTo: []
    });

    const [isReasonModalOpen, setIsReasonModalOpen] = useState(false);
    const [lateReason, setLateReason] = useState('');
    const [pendingUpdate, setPendingUpdate] = useState<{ taskId: string, status: string } | null>(null);

    const { token, user } = useAuthStore();

    // STRICT RBAC for task creation
    // Manager & SuperAdmin: Can create tasks and assign to anyone
    // Member: Can ONLY create tasks for themselves
    // Admin: CANNOT create tasks (unless authorized for specific project)
    const canCreateTask = user?.role === 'Manager' || user?.role === 'SuperAdmin' || user?.role === 'Member';
    const canAssignUsers = user?.role === 'Manager' || user?.role === 'SuperAdmin';

    // STRICT RBAC for task deletion
    // SuperAdmin: Can delete any task
    // Manager: Can delete tasks in their own projects
    // Admin: Can delete ONLY if authorized for that task's project
    // Member: Cannot delete tasks
    const canDeleteTask = (task: Task) => {
        if (user?.role === 'SuperAdmin') return true;
        if (user?.role === 'Member') return false;

        if (user?.role === 'Manager') {
            // Manager can delete tasks in projects they own
            const projectData = task.project as any;
            return projectData?.owner === user._id;
        }

        if (user?.role === 'Admin') {
            // Admin can delete only if authorized for this task's project
            const projectData = task.project as any;
            const isAuthorized = projectData?.members?.some((m: any) => {
                const memberId = m.user?._id || m.user;
                return memberId === user._id && m.role === 'Admin';
            });
            return isAuthorized || false;
        }

        return false;
    };

    const fetchTasks = async () => {
        try {
            const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/tasks/my-tasks`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Backend now returns tasks array directly in data
            const tasksData = Array.isArray(response.data.data) ? response.data.data : [];
            setTasks(tasksData);
        } catch (error: any) {
            console.error('Failed to fetch tasks', error);
            toast.error('Failed to load tasks');
            setTasks([]); // Set empty array on error
        }
    };

    const fetchProjects = async () => {
        try {
            const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/projects`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Backend now returns projects array directly in data
            const projectsData = Array.isArray(response.data.data) ? response.data.data : [];
            setProjects(projectsData);
        } catch (error: any) {
            console.error('Failed to fetch projects', error);
            setProjects([]); // Set empty array on error
        }
    };

    const fetchUsers = async () => {
        if (!canAssignUsers) return;
        try {
            const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/users`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUsers(response.data.data.users);
        } catch (error: any) {
            console.error('Failed to fetch users', error);
        }
    };

    useEffect(() => {
        fetchTasks();
        fetchProjects();
        fetchUsers();
    }, [user?.role]);

    const handleCreateTask = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const payload = {
                ...newTask,
                // For Members: Force assign to themselves
                assignedTo: user?.role === 'Member'
                    ? [user._id]
                    : (newTask.assignedTo.length > 0 ? newTask.assignedTo : [])
            };

            await axios.post(
                `${import.meta.env.VITE_API_URL}/api/tasks`,
                payload,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            toast.success('Task created successfully!');
            setIsCreateModalOpen(false);
            setNewTask({
                title: '',
                description: '',
                status: 'Todo',
                priority: 'Medium',
                project: '',
                startDate: '',
                dueDate: '',
                assignedTo: []
            });
            fetchTasks();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to create task');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteTask = async (taskId: string) => {
        if (!confirm('Are you sure you want to delete this task?')) return;

        try {
            await axios.delete(
                `${import.meta.env.VITE_API_URL}/api/tasks/${taskId}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            toast.success('Task deleted successfully');
            fetchTasks();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to delete task');
        }
    };

    const processStatusUpdate = async (taskId: string, status: string, reason?: string) => {
        try {
            await axios.patch(
                `${import.meta.env.VITE_API_URL}/api/tasks/${taskId}`,
                { status, lateReason: reason },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            toast.success('Task status updated');
            fetchTasks();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to update task');
        }
    };

    const handleUpdateTaskStatus = async (taskId: string, newStatus: string) => {
        const task = tasks.find(t => t._id === taskId);
        if (!task) return;

        // Check if marking as Done and is overdue
        if (newStatus === 'Done' && task.dueDate && new Date() > new Date(task.dueDate) && task.status !== 'Done') {
            setPendingUpdate({ taskId, status: newStatus });
            setIsReasonModalOpen(true);
            return;
        }

        await processStatusUpdate(taskId, newStatus);
    };

    const confirmLateUpdate = async () => {
        if (!pendingUpdate || !lateReason.trim()) {
            toast.error("Please provide a reason.");
            return;
        }
        await processStatusUpdate(pendingUpdate.taskId, pendingUpdate.status, lateReason);
        setIsReasonModalOpen(false);
        setLateReason('');
        setPendingUpdate(null);
    };

    const columns = [
        { id: 'Todo', label: 'To Do', color: 'bg-slate-500' },
        { id: 'In Progress', label: 'In Progress', color: 'bg-blue-500' },
        { id: 'Done', label: 'Done', color: 'bg-green-500' }
    ];

    return (
        <div className="h-[calc(100vh-8rem)] flex flex-col space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold mb-1 bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
                        Task Board
                    </h1>
                    <p className="text-gray-400">Manage and track your tasks across projects.</p>
                </div>
                {canCreateTask && (
                    <div className="flex gap-3">
                        <Button
                            type="button"
                            leftIcon={<Plus size={18} />}
                            onClick={() => setIsCreateModalOpen(true)}
                            className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 w-full md:w-auto"
                        >
                            New Task
                        </Button>
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-x-auto">
                <div className="flex gap-6 h-full min-w-[1000px] pb-4">
                    {columns.map((col) => (
                        <div key={col.id} className="flex-1 flex flex-col min-w-[300px]">
                            <div className="flex items-center justify-between mb-4 px-2">
                                <div className="flex items-center gap-2">
                                    <span className={`w-2.5 h-2.5 rounded-full ${col.color}`} />
                                    <h3 className="font-bold text-lg">{col.label}</h3>
                                    <span className="bg-slate-800 text-gray-400 text-xs px-2 py-0.5 rounded-full border border-white/5">
                                        {tasks.filter(t => t.status === col.id).length}
                                    </span>
                                </div>
                            </div>

                            <div className="flex-1 bg-slate-900/30 rounded-2xl p-3 border border-white/5 overflow-y-auto custom-scrollbar">
                                <StaggerContainer className="space-y-3">
                                    {tasks
                                        .filter(task => task.status === col.id)
                                        .map((task) => (
                                            <FadeIn key={task._id}>
                                                <Card
                                                    hover
                                                    onClick={() => {
                                                        setSelectedTask(task);
                                                        setIsDetailsModalOpen(true);
                                                    }}
                                                    className="p-4 cursor-pointer border-l-4 border-l-transparent hover:border-l-indigo-500"
                                                >
                                                    <div className="flex justify-between items-start mb-2">
                                                        <span className={`
                                                            text-xs font-semibold px-2 py-0.5 rounded
                                                            ${task.priority === 'High' ? 'bg-red-500/10 text-red-400' :
                                                                task.priority === 'Medium' ? 'bg-orange-500/10 text-orange-400' :
                                                                    'bg-blue-500/10 text-blue-400'}
                                                        `}>
                                                            {task.priority}
                                                        </span>
                                                        {canDeleteTask(task) && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDeleteTask(task._id);
                                                                }}
                                                                className="text-gray-500 hover:text-red-400"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        )}
                                                    </div>

                                                    <h4 className="font-semibold mb-1.5 line-clamp-1">{task.title}</h4>
                                                    <p className="text-sm text-gray-400 mb-3 line-clamp-2">{task.description}</p>

                                                    {task.dueDate && (
                                                        <div className="text-xs text-gray-400 mb-2 flex items-center gap-1">
                                                            <Calendar size={12} />
                                                            Due: {new Date(task.dueDate).toLocaleString()}
                                                        </div>
                                                    )}

                                                    <div className="flex items-center justify-between pt-2 border-t border-white/5">
                                                        <div className="flex items-center gap-3 text-gray-500 text-xs">
                                                            <span className="flex items-center gap-1" title="Created At">
                                                                <Calendar size={14} />
                                                                {new Date(task.createdAt).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                        <select
                                                            value={task.status}
                                                            onChange={(e) => handleUpdateTaskStatus(task._id, e.target.value)}
                                                            className="text-xs bg-slate-800 border border-white/10 rounded px-2 py-1 text-gray-300"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <option value="Todo">To Do</option>
                                                            <option value="In Progress">In Progress</option>
                                                            <option value="Done">Done</option>
                                                        </select>
                                                    </div>
                                                </Card>
                                            </FadeIn>
                                        ))}
                                </StaggerContainer>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Create Task Modal */}
            <Modal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                title={user?.role === 'Member' ? 'Create Task for Yourself' : 'Create New Task'}
                size="lg"
            >
                <form onSubmit={handleCreateTask} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">
                                Task Title *
                            </label>
                            <Input
                                type="text"
                                placeholder="Enter title"
                                value={newTask.title}
                                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">
                                Project *
                            </label>
                            <select
                                value={newTask.project}
                                onChange={(e) => setNewTask({ ...newTask, project: e.target.value })}
                                required
                                className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                            >
                                <option value="">Select a project</option>
                                {projects.map((project) => (
                                    <option key={project._id} value={project._id}>
                                        {project.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">
                                Priority *
                            </label>
                            <select
                                value={newTask.priority}
                                onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as any })}
                                className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                            >
                                <option value="Low">Low</option>
                                <option value="Medium">Medium</option>
                                <option value="High">High</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">
                                Status *
                            </label>
                            <select
                                value={newTask.status}
                                onChange={(e) => setNewTask({ ...newTask, status: e.target.value as any })}
                                className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                            >
                                <option value="Todo">To Do</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Done">Done</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">
                                Due Date
                            </label>
                            <Input
                                type="datetime-local"
                                value={newTask.dueDate}
                                onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                                className="w-full"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">
                                Description *
                            </label>
                            <textarea
                                placeholder="Describe the task"
                                value={newTask.description}
                                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                                required
                                rows={5}
                                className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all resize-none h-[140px]"
                            />
                        </div>

                        {canAssignUsers && (
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">
                                    Assign To (Select multiple)
                                </label>
                                <div className="bg-slate-800 border border-white/10 rounded-xl px-2 py-2 h-[140px] overflow-y-auto custom-scrollbar">
                                    {users.filter(u => u.role === 'Manager' || u.role === 'Member').map((u) => (
                                        <div key={u._id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-white/5 rounded transition-colors">
                                            <input
                                                type="checkbox"
                                                id={`user-${u._id}`}
                                                checked={(newTask.assignedTo as any).includes(u._id)}
                                                onChange={(e) => {
                                                    const current = Array.isArray(newTask.assignedTo) ? newTask.assignedTo : [];
                                                    if (e.target.checked) {
                                                        setNewTask({ ...newTask, assignedTo: [...current, u._id] as any });
                                                    } else {
                                                        setNewTask({ ...newTask, assignedTo: current.filter(id => id !== u._id) as any });
                                                    }
                                                }}
                                                className="rounded border-gray-600 bg-slate-700 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                                            />
                                            <label htmlFor={`user-${u._id}`} className="text-sm text-gray-300 cursor-pointer flex-1 user-select-none">
                                                {u.name} <span className="text-xs text-gray-500">({u.role})</span>
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {user?.role === 'Member' && (
                            <div className="flex items-center justify-center">
                                <div className="text-center p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                                    <p className="text-sm text-indigo-400">
                                        This task will be assigned to you
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsCreateModalOpen(false)}
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            isLoading={isLoading}
                            className="flex-1 bg-gradient-to-r from-indigo-600 to-violet-600"
                        >
                            Create Task
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Task Details Modal */}
            <Modal
                isOpen={isDetailsModalOpen}
                onClose={() => setIsDetailsModalOpen(false)}
                title="Task Details"
                size="xl"
            >
                {selectedTask && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
                        {/* Left Column: Info & Description */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h2 className="text-2xl font-bold text-white mb-3">{selectedTask.title}</h2>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className={`px-2 py-0.5 rounded text-xs font-semibold
                                            ${selectedTask.priority === 'High' ? 'bg-red-500/10 text-red-400' :
                                                selectedTask.priority === 'Medium' ? 'bg-orange-500/10 text-orange-400' :
                                                    'bg-blue-500/10 text-blue-400'}`}>
                                            {selectedTask.priority}
                                        </span>
                                        <span className={`px-2 py-0.5 rounded text-xs font-semibold
                                            ${selectedTask.status === 'Done' ? 'bg-green-500/10 text-green-400' :
                                                selectedTask.status === 'In Progress' ? 'bg-blue-500/10 text-blue-400' :
                                                    'bg-slate-500/10 text-slate-400'}`}>
                                            {selectedTask.status}
                                        </span>
                                        {selectedTask.project && (
                                            <span className="text-xs text-indigo-400 font-medium bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                                                {(selectedTask.project as any).name || 'Unknown Project'}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-800/50 p-5 rounded-xl border border-white/5">
                                <h3 className="text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wider">Description</h3>
                                <p className="text-gray-300 leading-relaxed whitespace-pre-wrap text-sm">
                                    {selectedTask.description}
                                </p>
                            </div>

                            {(selectedTask as any).lateReason && (
                                <div className="bg-red-500/10 p-5 rounded-xl border border-red-500/20">
                                    <h3 className="text-xs font-semibold text-red-400 mb-2 uppercase tracking-wider flex items-center gap-2">
                                        <AlertTriangle size={14} />
                                        Late Completion Reason
                                    </h3>
                                    <p className="text-gray-300 leading-relaxed text-sm">
                                        {(selectedTask as any).lateReason}
                                    </p>
                                </div>
                            )}

                            {selectedTask.createdBy && (
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                    <span>Created by:</span>
                                    <div className="flex items-center gap-1.5 text-gray-300">
                                        <div className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-[10px]">
                                            {((selectedTask.createdBy as any).name || 'U').charAt(0)}
                                        </div>
                                        <span>{(selectedTask.createdBy as any).name || 'Unknown'}</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right Column: Meta Info */}
                        <div className="lg:col-span-1 space-y-6">
                            <div className="bg-slate-800/50 p-5 rounded-xl border border-white/5">
                                <h3 className="text-xs font-semibold text-gray-300 mb-4 uppercase tracking-wider flex items-center gap-2">
                                    <Users size={14} />
                                    Assigned To
                                </h3>
                                <div className="space-y-2 overflow-y-auto custom-scrollbar pr-2 max-h-[200px]">
                                    {selectedTask.assignedTo && selectedTask.assignedTo.length > 0 ? (
                                        selectedTask.assignedTo.map((user: any) => {
                                            const name = user?.name || 'Unknown User';
                                            const email = user?.email || 'No email';
                                            return (
                                                <div key={user?._id || Math.random()} className="flex items-center gap-3 bg-white/5 p-2.5 rounded-lg border border-white/5 hover:bg-white/10 transition-colors">
                                                    <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-xs border border-indigo-500/20">
                                                        {name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-medium text-white truncate">{name}</p>
                                                        <p className="text-[10px] text-gray-500 truncate">{email}</p>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <p className="text-gray-500 italic text-xs">Unassigned</p>
                                    )}
                                </div>
                            </div>

                            <div className="bg-slate-800/50 p-5 rounded-xl border border-white/5">
                                <h3 className="text-xs font-semibold text-gray-300 mb-3 uppercase tracking-wider flex items-center gap-2">
                                    <Calendar size={14} />
                                    Timelines
                                </h3>
                                <div className="space-y-3 text-sm">
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-500 text-xs">Created</span>
                                        <span className="text-gray-300 text-xs">{new Date(selectedTask.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    {selectedTask.startDate && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-500 text-xs">Start Date</span>
                                            <span className="text-gray-300 text-xs">{new Date(selectedTask.startDate).toLocaleDateString()}</span>
                                        </div>
                                    )}
                                    {selectedTask.dueDate && (
                                        <div className="flex justify-between items-center pt-2 border-t border-white/5">
                                            <span className="text-gray-500 text-xs font-medium">Due Date</span>
                                            <span className="text-indigo-300 text-xs font-bold">{new Date(selectedTask.dueDate).toLocaleDateString()}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Late Reason Modal */}
            <Modal
                isOpen={isReasonModalOpen}
                onClose={() => setIsReasonModalOpen(false)}
                title="Task Overdue Warning"
                size="sm"
            >
                <div className="space-y-4">
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 flex items-start gap-3">
                        <AlertTriangle className="text-yellow-500 shrink-0 mt-0.5" size={20} />
                        <div>
                            <h4 className="text-yellow-500 font-bold text-sm mb-1">Late Submission Detected</h4>
                            <p className="text-xs text-gray-400">
                                This task is past its due date. You must provide a reason for the delay to mark it as done.
                            </p>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Reason for Delay *
                        </label>
                        <textarea
                            value={lateReason}
                            onChange={(e) => setLateReason(e.target.value)}
                            placeholder="Explain why this task was completed late..."
                            className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all resize-none h-[100px]"
                            required
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <Button
                            variant="outline"
                            onClick={() => setIsReasonModalOpen(false)}
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={confirmLateUpdate}
                            className="flex-1 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500"
                        >
                            Confirm Completion
                        </Button>
                    </div>
                </div>
            </Modal >
        </div >
    );
};

export default Tasks;
