import { useState } from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { User, Mail, Shield, Bell, Lock } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import axios from 'axios';
import toast from 'react-hot-toast';

const Settings = () => {
    const { user, token, setUser } = useAuthStore();
    const [isLoading, setIsLoading] = useState(false);
    const [profileData, setProfileData] = useState({
        name: user?.name || '',
        email: user?.email || ''
    });

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const response = await axios.patch(
                `${import.meta.env.VITE_API_URL}/api/users/profile`,
                profileData,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setUser(response.data.data.user);
            toast.success('Profile updated successfully!');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to update profile');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-4xl space-y-8">
            <div>
                <h1 className="text-3xl font-bold mb-1 bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
                    Settings
                </h1>
                <p className="text-gray-400">Manage your account settings and preferences.</p>
            </div>

            {/* Profile Settings */}
            <Card className="p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center">
                        <User size={20} className="text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold">Profile Information</h2>
                        <p className="text-sm text-gray-400">Update your personal details</p>
                    </div>
                </div>

                <form onSubmit={handleUpdateProfile} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Full Name
                            </label>
                            <Input
                                type="text"
                                placeholder="Enter your name"
                                value={profileData.name}
                                onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                                leftIcon={<User size={18} />}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Email Address
                            </label>
                            <Input
                                type="email"
                                placeholder="Enter your email"
                                value={profileData.email}
                                onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                                leftIcon={<Mail size={18} />}
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-3 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                        <Shield size={20} className="text-indigo-400" />
                        <div className="flex-1">
                            <p className="text-sm font-medium text-white">Account Role</p>
                            <p className="text-xs text-gray-400">
                                {user?.role === 'SuperAdmin' ? 'Super Admin' : user?.role}
                            </p>
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <Button
                            type="submit"
                            isLoading={isLoading}
                            className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500"
                        >
                            Save Changes
                        </Button>
                    </div>
                </form>
            </Card>

            {/* Privacy Settings */}
            <Card className="p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                        <Lock size={20} className="text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold">Privacy & Sharing</h2>
                        <p className="text-sm text-gray-400">Control who can see your projects</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-white/5">
                        <div>
                            <p className="font-medium">Project Visibility</p>
                            <p className="text-sm text-gray-400">Allow others to view your projects</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" defaultChecked />
                            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-white/5">
                        <div>
                            <p className="font-medium">Share Activity</p>
                            <p className="text-sm text-gray-400">Show your activity to team members</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" defaultChecked />
                            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                    </div>
                </div>
            </Card>

            {/* Notifications */}
            <Card className="p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center">
                        <Bell size={20} className="text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold">Notifications</h2>
                        <p className="text-sm text-gray-400">Manage your notification preferences</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-white/5">
                        <div>
                            <p className="font-medium">Email Notifications</p>
                            <p className="text-sm text-gray-400">Receive updates via email</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" defaultChecked />
                            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-white/5">
                        <div>
                            <p className="font-medium">Task Reminders</p>
                            <p className="text-sm text-gray-400">Get reminded about upcoming tasks</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" defaultChecked />
                            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default Settings;
