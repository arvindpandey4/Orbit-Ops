import authService from '../services/authService.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import config from '../config/index.js';

class AuthController {
    register = asyncHandler(async (req, res) => {
        // For public registration, req.user will be undefined
        const createdBy = req.user ? req.user._id : null;
        const user = await authService.register(req.body, createdBy);

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            data: { user },
        });
    });

    login = asyncHandler(async (req, res) => {
        const { email, password } = req.body;
        const ipAddress = req.ip;
        const userAgent = req.get('user-agent');

        const { user, accessToken, refreshToken } = await authService.login(
            email,
            password,
            ipAddress,
            userAgent
        );

        // Set refresh token as HTTP-only cookie
        res.cookie('refreshToken', refreshToken, config.jwt.cookieOptions);

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                user,
                accessToken,
                refreshToken,
            },
        });
    });

    googleAuth = asyncHandler(async (req, res) => {
        // req.user already contains {user, accessToken, refreshToken} from Passport strategy
        const { user, accessToken, refreshToken } = req.user;

        res.cookie('refreshToken', refreshToken, config.jwt.cookieOptions);

        // Check if this is an admin login attempt from OAuth state parameter
        const adminIntent = req.query.state === 'admin';

        // Redirect to appropriate callback based on admin intent and user role
        if (adminIntent) {
            // Admin login attempt - verify user has Admin role
            if (user.role === 'Admin') {
                if (!user.isActive) {
                    res.redirect(`${config.frontendUrl}/admin/login?error=pending_approval`);
                } else {
                    res.redirect(`${config.frontendUrl}/auth/admin-callback?token=${accessToken}`);
                }
            } else {
                // User is not an admin, redirect to login with error
                res.redirect(`${config.frontendUrl}/admin/login?error=insufficient_permissions`);
            }
        } else {
            // Regular login
            if (!user.isActive) {
                res.redirect(`${config.frontendUrl}/login?error=account_pending`);
            } else {
                res.redirect(`${config.frontendUrl}/auth/callback?token=${accessToken}`);
            }
        }
    });

    refreshToken = asyncHandler(async (req, res) => {
        const { accessToken, refreshToken } = await authService.refreshToken(
            req.user,
            req.refreshToken
        );

        res.cookie('refreshToken', refreshToken, config.jwt.cookieOptions);

        res.json({
            success: true,
            message: 'Token refreshed successfully',
            data: { accessToken, refreshToken },
        });
    });

    logout = asyncHandler(async (req, res) => {
        const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
        await authService.logout(req.user, req.token, refreshToken);

        res.clearCookie('refreshToken');

        res.json({
            success: true,
            message: 'Logout successful',
        });
    });

    logoutAll = asyncHandler(async (req, res) => {
        await authService.logoutAll(req.user, req.token);

        res.clearCookie('refreshToken');

        res.json({
            success: true,
            message: 'Logged out from all devices',
        });
    });

    getCurrentUser = asyncHandler(async (req, res) => {
        res.json({
            success: true,
            data: { user: req.user },
        });
    });

    forgotPassword = asyncHandler(async (req, res) => {
        const { email } = req.body;
        await authService.requestPasswordReset(email);

        res.json({
            success: true,
            message: 'Password reset token sent to email',
        });
    });

    resetPassword = asyncHandler(async (req, res) => {
        const { token } = req.params;
        const { password } = req.body;
        await authService.resetPassword(token, password);

        res.json({
            success: true,
            message: 'Password reset successful',
        });
    });
}

export default new AuthController();
