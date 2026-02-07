import { useState, useEffect } from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Modal } from '../components/Modal';
import { StaggerContainer, ScaleIn } from '../components/Animations';
import { Plus, Search, Calendar, Users, Trash2 } from 'lucide-react';
import axios from 'axios';
import { Project } from '../types';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';

const Projects = () => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

    const [newProject, setNewProject] = useState<{
        name: string;
        description: string;
        tags: string;
        members: string[];
        authorizedAdmin: string;
    }>({
        name: '',
        description: '',
        tags: '',
        members: [],
        authorizedAdmin: ''
    });

    const { token, user } = useAuthStore();

    // STRICT RBAC for project creation
    // Manager & SuperAdmin: Can create projects
    const canCreateProject = user?.role === 'Manager' || user?.role === 'SuperAdmin';

    // STRICT RBAC for project deletion
    // SuperAdmin: Can delete any project
    // Manager: Can delete ONLY their own projects (where they are owner)
    // Admin: Can delete ONLY if authorized (member with Admin role in that project)
    const canDeleteProject = (project: Project) => {
        if (user?.role === 'SuperAdmin') return true;
        if (user?.role === 'Manager' && project.owner === user._id) return true;
        if (user?.role === 'Admin') {
            // Check if this Admin is authorized for this project
            const isAuthorized = project.members?.some((m: any) => {
                const memberId = m.user?._id || m.user;
                return memberId === user._id && m.role === 'Admin';
            });
            return isAuthorized || false;
        }
        return false;
    };

    const fetchUsers = async () => {
        try {
            const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/users`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = response.data.data;
            const userList = Array.isArray(data) ? data : (data.users || []);
            setUsers(userList);
        } catch (error: any) {
            console.error('Failed to fetch users', error);
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
            toast.error('Failed to load projects');
            setProjects([]); // Set empty array on error
        }
    };

    useEffect(() => {
        fetchProjects();
        if (canCreateProject) {
            fetchUsers();
        }
    }, [user?.role, canCreateProject]);

    const handleCreateProject = async (e: React.FormEvent) => {
        e.preventDefault();

        // Double-check permission on submit
        if (!canCreateProject) {
            toast.error('You do not have permission to create projects');
            return;
        }

        if (!newProject.name.trim() || !newProject.description.trim()) {
            toast.error('Please fill in all required fields');
            return;
        }

        setIsLoading(true);

        try {
            const projectData = {
                name: newProject.name,
                description: newProject.description,
                tags: newProject.tags.split(',').map(tag => tag.trim()).filter(Boolean),
                members: newProject.members,
                authorizedAdmin: newProject.authorizedAdmin || undefined
            };

            await axios.post(
                `${import.meta.env.VITE_API_URL}/api/projects`,
                projectData,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            toast.success('Project created successfully!');
            setIsCreateModalOpen(false);
            setNewProject({ name: '', description: '', tags: '', members: [], authorizedAdmin: '' });
            fetchProjects();
        } catch (error: any) {
            console.error('Create project error:', error);
            toast.error(error.response?.data?.message || 'Failed to create project');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteProject = async (projectId: string) => {
        if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) return;

        try {
            await axios.delete(
                `${import.meta.env.VITE_API_URL}/api/projects/${projectId}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            toast.success('Project deleted successfully');
            fetchProjects();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to delete project');
        }
    };

    const filteredProjects = projects.filter(project =>
        project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (project.description || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen pb-8">
            {/* Header Section */}
            <div className="mb-8">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
                            Mission Projects
                        </h1>
                        <p className="text-gray-400 text-lg">Manage your projects and team collaboration</p>
                    </div>
                </div>
            </div>

            {/* Search and Filter Bar */}
            <Card className="p-6 mb-8 bg-slate-800/60 backdrop-blur-xl border-white/10">
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="w-full md:w-2/3 lg:w-1/2">
                        <Input
                            placeholder="Search projects by name or description..."
                            leftIcon={<Search size={20} />}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full text-base"
                        />
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                        <div className="px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
                            <span className="text-indigo-400 font-semibold">{filteredProjects.length}</span>
                            <span className="text-gray-400 ml-2">
                                {filteredProjects.length === 1 ? 'Project' : 'Projects'}
                            </span>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Projects Grid or Empty State */}
            {filteredProjects.length === 0 ? (
                <Card className="p-16 text-center bg-slate-800/40 backdrop-blur-xl border-white/5">
                    <div
                        onClick={() => canCreateProject && setIsCreateModalOpen(true)}
                        className={`w-24 h-24 bg-gradient-to-br from-indigo-600/20 to-violet-600/20 rounded-3xl flex items-center justify-center mx-auto mb-6 border-2 border-dashed border-indigo-500/30 ${canCreateProject ? 'cursor-pointer hover:scale-110 hover:border-indigo-500/60 transition-all duration-300' : 'opacity-50 cursor-not-allowed'}`}
                    >
                        <Plus size={48} className="text-indigo-400" />
                    </div>
                    <h3 className="text-2xl font-bold mb-3 text-white">
                        {searchQuery ? 'No projects found' : 'No projects yet'}
                    </h3>
                    <p className="text-gray-400 mb-8 text-lg max-w-md mx-auto">
                        {searchQuery
                            ? 'Try adjusting your search terms'
                            : canCreateProject
                                ? 'Click the plus icon above to create your first project'
                                : 'You will see projects here once you are assigned to them'}
                    </p>
                </Card>
            ) : (
                <StaggerContainer className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {filteredProjects.map((project) => (
                        <ScaleIn key={project._id}>
                            <Card
                                hover
                                onClick={() => {
                                    setSelectedProject(project);
                                    setIsDetailsModalOpen(true);
                                }}
                                className="group cursor-pointer relative overflow-hidden border-white/5 hover:border-indigo-500/30 transition-all duration-300 p-5"
                            >
                                {/* Header Row */}
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center text-indigo-400 font-bold text-xl border border-indigo-500/20 group-hover:scale-110 transition-transform flex-shrink-0">
                                            {project.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-lg font-bold group-hover:text-indigo-400 transition-colors truncate">
                                                {project.name}
                                            </h3>
                                            <p className="text-sm text-gray-400 line-clamp-1">
                                                {project.description}
                                            </p>
                                        </div>
                                    </div>
                                    {canDeleteProject(project) && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteProject(project._id);
                                            }}
                                            className="text-gray-500 hover:text-red-400 transition-colors p-2 hover:bg-red-500/10 rounded-lg flex-shrink-0"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>

                                {/* Tags */}
                                {project.tags && project.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mb-3">
                                        {project.tags.slice(0, 3).map((tag, index) => (
                                            <span
                                                key={index}
                                                className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 rounded-md text-xs font-medium border border-indigo-500/20"
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                        {project.tags.length > 3 && (
                                            <span className="px-2 py-0.5 bg-slate-700/50 text-gray-400 rounded-md text-xs">
                                                +{project.tags.length - 3}
                                            </span>
                                        )}
                                    </div>
                                )}

                                {/* Footer Row */}
                                <div className="flex items-center justify-between pt-3 border-t border-white/5">
                                    <div className="flex items-center gap-4 text-xs text-gray-500">
                                        <span className="flex items-center gap-1.5">
                                            <Users size={14} />
                                            {project.members?.length || 0} members
                                        </span>
                                        <span className="flex items-center gap-1.5">
                                            <Calendar size={14} />
                                            {new Date(project.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            </Card>
                        </ScaleIn>
                    ))}
                </StaggerContainer>
            )}

            {/* Create Project Modal - Only accessible to Manager/SuperAdmin */}
            {canCreateProject && (
                <Modal
                    isOpen={isCreateModalOpen}
                    onClose={() => setIsCreateModalOpen(false)}
                    title="Create New Project"
                    size="lg"
                >
                    <form onSubmit={handleCreateProject} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Project Name <span className="text-red-400">*</span>
                                </label>
                                <Input
                                    type="text"
                                    placeholder="Enter project name"
                                    value={newProject.name}
                                    onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Tags (comma-separated)
                                </label>
                                <Input
                                    type="text"
                                    placeholder="e.g. Design, Frontend, Mobile"
                                    value={newProject.tags}
                                    onChange={(e) => setNewProject({ ...newProject, tags: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Description <span className="text-red-400">*</span>
                            </label>
                            <textarea
                                placeholder="Describe your project goals and objectives"
                                value={newProject.description}
                                onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                                required
                                rows={4}
                                className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all resize-none"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Assign Authorized Admin (Optional)
                                </label>
                                <select
                                    value={newProject.authorizedAdmin || ''}
                                    onChange={(e) => setNewProject({ ...newProject, authorizedAdmin: e.target.value })}
                                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                                >
                                    <option value="">None</option>
                                    {users.filter(u => u.role === 'Admin').map(admin => (
                                        <option key={admin._id} value={admin._id}>
                                            {admin.name} ({admin.email})
                                        </option>
                                    ))}
                                </select>
                                <p className="text-xs text-gray-500 mt-1">Admin who can manage this project</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Team Members
                                </label>
                                <div className="bg-slate-800 border border-white/10 rounded-xl px-3 py-2 max-h-[120px] overflow-y-auto custom-scrollbar">
                                    {users.filter(u => u.role === 'Manager' || u.role === 'Member').length > 0 ? (
                                        users.filter(u => u.role === 'Manager' || u.role === 'Member').map((u) => (
                                            <div key={u._id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-white/5 rounded transition-colors">
                                                <input
                                                    type="checkbox"
                                                    id={`project-user-${u._id}`}
                                                    checked={newProject.members.includes(u._id)}
                                                    onChange={(e) => {
                                                        const current = newProject.members;
                                                        if (e.target.checked) {
                                                            setNewProject({ ...newProject, members: [...current, u._id] });
                                                        } else {
                                                            setNewProject({ ...newProject, members: current.filter(id => id !== u._id) });
                                                        }
                                                    }}
                                                    className="rounded border-gray-600 bg-slate-700 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                                                />
                                                <label htmlFor={`project-user-${u._id}`} className="text-sm text-gray-300 cursor-pointer flex-1">
                                                    {u.name} <span className="text-xs text-gray-500">({u.role})</span>
                                                </label>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-gray-500 text-xs p-2 text-center">No team members available</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4 border-t border-white/10">
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
                                Create Project
                            </Button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* Project Details Modal */}
            <Modal
                isOpen={isDetailsModalOpen}
                onClose={() => setIsDetailsModalOpen(false)}
                title="Project Details"
                size="xl"
            >
                {selectedProject && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
                        {/* Left Column: Basic Info & Description */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="flex items-start gap-5">
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center text-indigo-400 font-bold text-3xl border border-indigo-500/20 flex-shrink-0">
                                    {selectedProject.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-white mb-2">{selectedProject.name}</h2>
                                    <div className="flex items-center gap-4 text-gray-400 text-sm">
                                        <span className="flex items-center gap-1.5">
                                            <Calendar size={14} />
                                            Created {new Date(selectedProject.createdAt).toLocaleDateString()}
                                        </span>
                                        <span className="flex items-center gap-1.5">
                                            <Users size={14} />
                                            {selectedProject.members?.length || 0} members
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-800/50 p-5 rounded-xl border border-white/5">
                                <h3 className="text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wider">Description</h3>
                                <p className="text-gray-300 leading-relaxed whitespace-pre-wrap text-sm">
                                    {selectedProject.description}
                                </p>
                            </div>

                            <div className="bg-slate-800/50 p-5 rounded-xl border border-white/5">
                                <h3 className="text-xs font-semibold text-gray-300 mb-3 uppercase tracking-wider">Tags</h3>
                                <div className="flex flex-wrap gap-2">
                                    {selectedProject.tags && selectedProject.tags.length > 0 ? (
                                        selectedProject.tags.map((tag, index) => (
                                            <span
                                                key={index}
                                                className="px-3 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-medium"
                                            >
                                                {tag}
                                            </span>
                                        ))
                                    ) : (
                                        <p className="text-gray-500 italic text-xs">No tags</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Team Members */}
                        <div className="lg:col-span-1">
                            <div className="bg-slate-800/50 p-5 rounded-xl border border-white/5 h-full flex flex-col">
                                <h3 className="text-xs font-semibold text-gray-300 mb-4 uppercase tracking-wider flex items-center gap-2">
                                    <Users size={14} />
                                    Team Members
                                </h3>
                                <div className="space-y-2 overflow-y-auto custom-scrollbar pr-2 flex-1 max-h-[400px]">
                                    {selectedProject.members && selectedProject.members.length > 0 ? (
                                        selectedProject.members.map((member: any) => {
                                            const memberUser = member.user || member;
                                            const name = memberUser.name || 'Unknown User';
                                            const email = memberUser.email || 'No email';
                                            return (
                                                <div key={memberUser._id || Math.random()} className="flex items-center gap-3 bg-white/5 p-2.5 rounded-lg border border-white/5 hover:bg-white/10 transition-colors">
                                                    <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-xs border border-indigo-500/20">
                                                        {name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-white truncate">{name}</p>
                                                        <p className="text-[10px] text-gray-500 truncate">{email}</p>
                                                    </div>
                                                    {member.role === 'Admin' && (
                                                        <span className="text-[10px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded border border-purple-500/20">Admin</span>
                                                    )}
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <p className="text-gray-500 italic text-xs">No members assigned</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default Projects;
