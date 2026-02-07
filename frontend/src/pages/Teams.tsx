import { useState, useEffect } from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Modal } from '../components/Modal';
import { StaggerContainer, ScaleIn } from '../components/Animations';
import { Mail, UserPlus, Users as UsersIcon, Shield, Trash2, Check, X } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';

interface TeamMember {
    _id: string;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
    createdAt: string;
    isOnline?: boolean;
}


import { useSocketStore } from '../store/socketStore';

const Teams = () => {
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isPageLoading, setIsPageLoading] = useState(true);
    const [inviteData, setInviteData] = useState({
        name: '',
        email: '',
        role: 'Member' as 'Admin' | 'Manager' | 'Member'
    });

    const [pendingAdmins, setPendingAdmins] = useState<TeamMember[]>([]);
    const [pendingMembers, setPendingMembers] = useState<TeamMember[]>([]);

    const { token, user } = useAuthStore();
    const { onlineUsers } = useSocketStore();

    const isUserOnline = (userId: string, memberIsOnline?: boolean) => {
        // Check socket status first, fallback to initial DB status
        if (onlineUsers[userId]) return onlineUsers[userId] === 'online';
        return !!memberIsOnline;
    };

    const fetchTeamMembers = async () => {
        try {
            const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/users`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Handle pagination wrapper (users property) or direct array
            const payload = response.data.data;
            const members = Array.isArray(payload) ? payload : (payload.users || payload.data || []);
            setTeamMembers(members);
        } catch (error: any) {
            console.error('Failed to fetch team members', error);
            if (error.response?.status === 403) {
                toast.error('You do not have permission to view team members');
            } else {
                toast.error('Failed to load team members');
            }
        } finally {
            setIsPageLoading(false);
        }
    };

    const fetchPendingAdmins = async () => {
        try {
            const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/users/pending-admins`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Handle both structure types (array or paginated object)
            const data = response.data.data;
            setPendingAdmins(Array.isArray(data) ? data : (data.users || []));
        } catch (error) {
            console.error('Failed to fetch pending admins', error);
        }
    };

    const fetchPendingMembers = async () => {
        try {
            const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/users/pending-members`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = response.data.data;
            setPendingMembers(Array.isArray(data) ? data : (data.users || []));
        } catch (error) {
            console.error('Failed to fetch pending members', error);
        }
    };

    useEffect(() => {
        if (token && user) {
            setIsPageLoading(true);
            fetchTeamMembers();
            if (user?.role === 'SuperAdmin') {
                fetchPendingAdmins();
            }
            if (['Admin', 'SuperAdmin'].includes(user?.role || '')) {
                fetchPendingMembers();
            }
        }
    }, [user?.role, token]);

    const handleInviteUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            await axios.post(
                `${import.meta.env.VITE_API_URL}/api/users`,
                {
                    ...inviteData,
                    password: Math.random().toString(36).slice(-8) + 'A1!' // Temporary password
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            toast.success(`Invitation sent to ${inviteData.email}!`);
            setIsInviteModalOpen(false);
            setInviteData({ name: '', email: '', role: 'Member' });
            fetchTeamMembers();
            if (user?.role === 'SuperAdmin') fetchPendingAdmins();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to invite user');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteUser = async (userId: string) => {
        if (!confirm('Are you sure you want to remove this team member?')) return;

        try {
            await axios.delete(
                `${import.meta.env.VITE_API_URL}/api/users/${userId}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            toast.success('Team member removed successfully');
            fetchTeamMembers();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to remove team member');
        }
    };

    const handleUpdateRole = async (userId: string, newRole: string) => {
        try {
            await axios.put(`${import.meta.env.VITE_API_URL}/api/users/${userId}`,
                { role: newRole },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            // Immediate UI update
            setTeamMembers(members => members.map(m =>
                m._id === userId ? { ...m, role: newRole } : m
            ));

            toast.success('Role updated successfully');
            fetchTeamMembers();
        } catch (error: any) {
            toast.error('Failed to update role');
        }
    };

    const handleApproveAdmin = async (userId: string) => {
        try {
            await axios.post(`${import.meta.env.VITE_API_URL}/api/users/${userId}/approve`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Admin approved successfully');
            fetchPendingAdmins();
            fetchTeamMembers();
        } catch (error) {
            toast.error('Failed to approve admin');
        }
    };

    const handleApproveMember = async (userId: string) => {
        try {
            await axios.patch(`${import.meta.env.VITE_API_URL}/api/users/${userId}/activate`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Member approved successfully');
            fetchPendingMembers();
            fetchTeamMembers();
        } catch (error) {
            toast.error('Failed to approve member');
        }
    };

    const getRoleBadgeColor = (role: string) => {
        switch (role) {
            case 'SuperAdmin':
                return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
            case 'Admin':
                return 'bg-red-500/10 text-red-400 border-red-500/20';
            case 'Manager':
                return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
            default:
                return 'bg-green-500/10 text-green-400 border-green-500/20';
        }
    };

    const canManageRoles = ['Admin', 'SuperAdmin'].includes(user?.role || '');
    const canInvite = ['Admin', 'SuperAdmin'].includes(user?.role || '');

    if (isPageLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-400">Loading team members...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold mb-1 bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
                        Team Members
                    </h1>
                    <p className="text-gray-400">Manage your team and send invitations.</p>
                </div>
                {canInvite && (
                    <Button
                        leftIcon={<UserPlus size={18} />}
                        onClick={() => setIsInviteModalOpen(true)}
                        className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 w-full md:w-auto"
                    >
                        Invite Member
                    </Button>
                )}
            </div>

            {/* Pending Admins Section (SuperAdmin Only) */}
            {user?.role === 'SuperAdmin' && pendingAdmins.length > 0 && (
                <div className="space-y-4">
                    <h2 className="text-xl font-bold text-yellow-400 flex items-center gap-2">
                        <Shield size={20} />
                        Pending Admin Approvals
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {pendingAdmins.map((admin) => (
                            <Card key={admin._id} className="p-6 relative border-yellow-500/20 bg-yellow-500/5">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-bold">{admin.name}</h3>
                                    <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded">Pending</span>
                                </div>
                                <p className="text-sm text-gray-400 mb-4">{admin.email}</p>
                                <div className="flex gap-3">
                                    <Button
                                        onClick={() => handleDeleteUser(admin._id)}
                                        className="flex-1 bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20"
                                        title="Reject"
                                    >
                                        <X size={20} />
                                    </Button>
                                    <Button
                                        onClick={() => handleApproveAdmin(admin._id)}
                                        className="flex-[3] bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20 flex items-center justify-center gap-2"
                                    >
                                        <Check size={20} /> Approve
                                    </Button>
                                </div>
                            </Card>
                        ))}
                    </div>
                    <div className="border-b border-white/10 my-8" />
                </div>
            )}

            {/* Pending Members Section (Admin & SuperAdmin) */}
            {['Admin', 'SuperAdmin'].includes(user?.role || '') && pendingMembers.length > 0 && (
                <div className="space-y-4">
                    <h2 className="text-xl font-bold text-blue-400 flex items-center gap-2">
                        <UsersIcon size={20} />
                        Pending Member Approvals
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {pendingMembers.map((member) => (
                            <Card key={member._id} className="p-6 relative border-blue-500/20 bg-blue-500/5">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-bold">{member.name}</h3>
                                    <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">Pending</span>
                                </div>
                                <p className="text-sm text-gray-400 mb-4">{member.email}</p>
                                <p className="text-xs text-slate-500 mb-4 font-mono">Role: {member.role}</p>
                                <div className="flex gap-3">
                                    <Button
                                        onClick={() => handleDeleteUser(member._id)}
                                        className="flex-1 bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20"
                                        title="Reject"
                                    >
                                        <X size={20} />
                                    </Button>
                                    <Button
                                        onClick={() => handleApproveMember(member._id)}
                                        className="flex-[3] bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20 flex items-center justify-center gap-2"
                                    >
                                        <Check size={20} /> Approve
                                    </Button>
                                </div>
                            </Card>
                        ))}
                    </div>
                    <div className="border-b border-white/10 my-8" />
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <StaggerContainer className="contents">
                    {teamMembers
                        .filter(member => !(member.role === 'Admin' && !member.isActive) && member.role !== 'SuperAdmin')
                        .map((member) => (
                            <ScaleIn key={member._id}>
                                <Card hover className="p-6 relative group/card">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white font-bold text-lg">
                                            {member.name.charAt(0).toUpperCase()}
                                        </div>
                                        {canManageRoles && member._id !== user?._id && member.role !== 'SuperAdmin' && (
                                            <button
                                                onClick={() => handleDeleteUser(member._id)}
                                                className="text-gray-500 hover:text-red-400 transition-colors opacity-0 group-hover/card:opacity-100"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>

                                    <h3 className="text-lg font-bold mb-1">{member.name}</h3>
                                    <p className="text-sm text-gray-400 mb-4 flex items-center gap-2">
                                        <Mail size={14} />
                                        {member.email}
                                    </p>

                                    <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                        {canManageRoles && member._id !== user?._id && member.role !== 'SuperAdmin' ? (
                                            <select
                                                value={member.role}
                                                onChange={(e) => handleUpdateRole(member._id, e.target.value)}
                                                className={`text-xs font-semibold px-2 py-1 rounded-lg border bg-[#050508] outline-none cursor-pointer ${getRoleBadgeColor(member.role)}`}
                                            >
                                                <option value="Member">Member</option>
                                                <option value="Manager">Manager</option>
                                                {user?.role === 'SuperAdmin' && <option value="Admin">Admin</option>}
                                            </select>
                                        ) : (
                                            <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${getRoleBadgeColor(member.role)}`}>
                                                <Shield size={12} className="inline mr-1" />
                                                {member.role === 'SuperAdmin' ? 'Super Admin' : member.role}
                                            </span>
                                        )}
                                        <span className={`text-xs font-medium ${isUserOnline(member._id, (member as any).isOnline) ? 'text-green-400' : 'text-gray-500'}`}>
                                            {isUserOnline(member._id, (member as any).isOnline) ? '● Online' : '○ Offline'}
                                        </span>
                                    </div>
                                </Card>
                            </ScaleIn>
                        ))}
                </StaggerContainer>
            </div>

            {teamMembers.length === 0 && (
                <Card className="p-12 text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-600/20 to-violet-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <UsersIcon size={32} className="text-indigo-400" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">No team members yet</h3>
                    <p className="text-gray-400 mb-6">Invite your first team member to get started</p>
                    {canInvite && (
                        <Button
                            onClick={() => setIsInviteModalOpen(true)}
                            leftIcon={<UserPlus size={18} />}
                        >
                            Invite Member
                        </Button>
                    )}
                </Card>
            )}

            {/* Invite Modal */}
            <Modal
                isOpen={isInviteModalOpen}
                onClose={() => setIsInviteModalOpen(false)}
                title="Invite Team Member"
                size="sm"
            >
                <form onSubmit={handleInviteUser} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Full Name *
                        </label>
                        <Input
                            type="text"
                            placeholder="Enter member name"
                            value={inviteData.name}
                            onChange={(e) => setInviteData({ ...inviteData, name: e.target.value })}
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Email Address *
                        </label>
                        <Input
                            type="email"
                            placeholder="member@example.com"
                            value={inviteData.email}
                            onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                            leftIcon={<Mail size={18} />}
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Role *
                        </label>
                        <select
                            value={inviteData.role}
                            onChange={(e) => setInviteData({ ...inviteData, role: e.target.value as any })}
                            className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                        >
                            <option value="Member">Team Member</option>
                            <option value="Manager">Project Manager</option>
                            {['Admin', 'SuperAdmin'].includes(user?.role || '') && <option value="Admin">Admin</option>}
                        </select>
                        <p className="text-xs text-gray-500 mt-2">
                            An invitation email will be sent with temporary credentials
                        </p>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsInviteModalOpen(false)}
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            isLoading={isLoading}
                            className="flex-1 bg-gradient-to-r from-indigo-600 to-violet-600"
                            leftIcon={<Mail size={18} />}
                        >
                            Send Invite
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Teams;
