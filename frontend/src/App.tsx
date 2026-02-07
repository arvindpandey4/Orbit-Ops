import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import axios from 'axios';
import { useAuthStore } from './store/authStore';
import { useSocketStore } from './store/socketStore';
import Login from './pages/Login';
import Register from './pages/Register';
import AuthCallback from './pages/AuthCallback';
import AdminAuthCallback from './pages/AdminAuthCallback';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import Tasks from './pages/Tasks';
import Teams from './pages/Teams';
import Settings from './pages/Settings';
import AdminLogin from './pages/AdminLogin';
import AdminRegister from './pages/AdminRegister';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import { DashboardLayout } from './components/DashboardLayout';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    return isAuthenticated ? <DashboardLayout>{children}</DashboardLayout> : <Navigate to="/login" />;
};

const App = () => {
    const { connect, disconnect } = useSocketStore();
    const { isAuthenticated, setUser } = useAuthStore();

    useEffect(() => {
        const initAuth = async () => {
            if (isAuthenticated) {
                // Connect socket
                connect();
                try {
                    // Refresh user data to ensure roles/permissions are up to date
                    const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/auth/me`);
                    setUser(response.data.data.user);
                } catch (error) {
                    console.error('Failed to refresh user data', error);
                }
            } else {
                disconnect();
            }
        };

        initAuth();
    }, [isAuthenticated, connect, disconnect, setUser]);

    return (
        <Router>
            <Toaster
                position="top-right"
                toastOptions={{
                    style: {
                        background: '#1e293b',
                        color: '#fff',
                        border: '1px solid rgba(255,255,255,0.1)',
                    },
                    success: {
                        iconTheme: {
                            primary: '#10b981',
                            secondary: '#fff',
                        },
                    },
                    error: {
                        iconTheme: {
                            primary: '#ef4444',
                            secondary: '#fff',
                        },
                    },
                }}
            />
            <Routes>
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route path="/auth/admin-callback" element={<AdminAuthCallback />} />
                <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/dashboard" />} />
                <Route path="/register" element={!isAuthenticated ? <Register /> : <Navigate to="/dashboard" />} />

                {/* Admin Routes */}
                <Route path="/admin/login" element={!isAuthenticated ? <AdminLogin /> : <Navigate to="/dashboard" />} />
                <Route path="/admin/register" element={!isAuthenticated ? <AdminRegister /> : <Navigate to="/dashboard" />} />

                {/* Password Routes */}
                <Route path="/forgot-password" element={!isAuthenticated ? <ForgotPassword /> : <Navigate to="/dashboard" />} />
                <Route path="/reset-password/:token" element={!isAuthenticated ? <ResetPassword /> : <Navigate to="/dashboard" />} />

                <Route path="/" element={<Navigate to="/dashboard" />} />
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/projects" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
                <Route path="/tasks" element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
                <Route path="/team" element={<ProtectedRoute><Teams /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            </Routes>
        </Router>
    );
};

export default App;
