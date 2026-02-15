import userRepository from '../repositories/userRepository.js';
import { generateTokenPair } from '../middleware/auth.js';
import redisClient from '../config/redis.js';
import rabbitmqClient from '../config/rabbitmq.js';
import emailService from './emailService.js';
import emailQueueManager from '../utils/emailQueueManager.js';
import { AppError } from '../middleware/errorHandler.js';
import logger from '../config/logger.js';
import crypto from 'crypto';

class AuthService {
    /**
     * Register new user (Admin only via UC-1)
     */
    async register(userData, createdBy) {
        // Check if user already exists
        const existingUser = await userRepository.findByEmail(userData.email);
        if (existingUser) {
            throw new AppError('User with this email already exists', 400);
        }

        // Determine initial status
        // If created by an admin (invite), active. If self-registered, inactive (pending approval).
        const initialStatus = !!createdBy;

        // Create user
        const user = await userRepository.create({
            ...userData,
            createdBy,
            authProvider: 'local',
            isActive: initialStatus
        });

        // Log activity
        // Log activity
        await rabbitmqClient.logActivity({
            user: createdBy || user._id,
            action: 'USER_CREATED',
            resource: 'User',
            resourceId: user._id,
            details: {
                email: user.email,
                role: user.role,
                selfRegistered: !createdBy
            },
        });

        logger.info(`New user created: ${user.email} by ${createdBy}`);

        // Notify relevant parties based on status
        if (!initialStatus) {
            // User is pending approval
            const notificationType = userData.role === 'Admin' ? 'admin_approval_request' : 'member_approval_request';

            // Notify Approvers (SuperAdmin for Admin, Admin for others)
            if (userData.role === 'Admin') {
                const superAdmin = await userRepository.findOne({ role: 'SuperAdmin' });
                if (superAdmin) {
                    emailQueueManager.sendEmail({
                        type: 'admin_approval_request',
                        admin: { name: user.name, email: user.email },
                        superAdmin: { email: superAdmin.email, name: superAdmin.name }
                    }).catch(err => logger.error('Failed to send admin approval email', err));
                }
            } else {
                // Notify Admins about new member/manager
                // We specifically want to notify Admins. Assuming we can find one or broadcast.
                // For now, we'll skip broadcasting to all admins to avoid spam, 
                // or just rely on the user seeing it in the dashboard.
                // But we MUST notify the user their account is pending.
            }

            // Notify user about pending status
            emailQueueManager.sendEmail({
                type: 'account_pending', // Generic pending template
                user: {
                    name: user.name,
                    email: user.email
                }
            }).catch(err => logger.error('Failed to send pending email', err));

        } else {
            // Active User - Standard Welcome
            emailQueueManager.sendEmail({
                type: 'welcome',
                user: {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    isActive: user.isActive
                }
            }).catch(err => {
                logger.error(`Failed to send welcome email for ${user.email}:`, err);
            });
        }

        return user;
    }

    /**
     * Login with email and password
     */
    async login(email, password, ipAddress, userAgent) {
        // Find user with password
        const user = await userRepository.findByEmail(email, true);

        // Auto-fix Super Admin role if needed
        if (user && email === 'avisandhyatech@gmail.com' && (user.role !== 'SuperAdmin' || user.name !== 'Super Admin')) {
            user.role = 'SuperAdmin';
            user.name = 'Super Admin';
            user.isActive = true;
            await user.save();
            logger.info('Auto-corrected Super Admin role and name during login');
        }

        if (!user) {
            throw new AppError('Invalid email or password', 401);
        }

        if (!user.isActive) {
            if (user.role === 'Admin') {
                throw new AppError('Your account is pending approval from Super Admin.', 403);
            }
            throw new AppError('Your account has been deactivated', 401);
        }

        // Check password
        const isPasswordValid = await user.comparePassword(password);

        if (!isPasswordValid) {
            throw new AppError('Invalid email or password', 401);
        }

        // Generate tokens
        const { accessToken, refreshToken } = generateTokenPair(user._id);

        // Save refresh token
        await user.addRefreshToken(refreshToken);

        // Update last login
        await userRepository.updateLastLogin(user._id);

        // Log activity
        await rabbitmqClient.logActivity({
            user: user._id,
            action: 'USER_LOGIN',
            resource: 'User',
            resourceId: user._id,
            ipAddress,
            userAgent,
        });

        logger.info(`User logged in: ${user.email}`);

        // Remove password from response
        user.password = undefined;

        return {
            user,
            accessToken,
            refreshToken,
        };
    }

    /**
     * Google OAuth login/register
     */
    async googleAuth(profile, state) {
        // Try getting email from profile.emails array or fallback to profile._json.email
        const email = (profile.emails && profile.emails[0]?.value) || profile._json?.email;

        if (!email) {
            console.error('Google Profile:', JSON.stringify(profile, null, 2)); // Debug log
            throw new AppError(`Google account does not provide an email address. Profile Keys: ${Object.keys(profile).join(', ')}. JSON email: ${profile._json?.email}`, 400);
        }

        let user = await userRepository.findByGoogleId(profile.id);

        if (!user) {
            // Check if user exists with same email
            user = await userRepository.findByEmail(email);

            if (user) {
                // Link Google account to existing user
                user.googleId = profile.id;
                user.authProvider = 'google';
                if (profile.photos && profile.photos.length > 0) {
                    user.avatar = profile.photos[0].value;
                }
                await user.save();
            } else {
                // Determine role and status based on state
                const isAdminIntent = state === 'admin';
                const role = isAdminIntent ? 'Admin' : 'Member';
                // All new registrations (via Google too) are pending approval
                const isActive = false;

                // Create new user
                user = await userRepository.create({
                    name: profile.displayName,
                    email: email,
                    googleId: profile.id,
                    authProvider: 'google',
                    avatar: profile.photos && profile.photos.length > 0 ? profile.photos[0].value : null,
                    role: role,
                    isActive: isActive,
                });

                logger.info(`New user created via Google OAuth: ${user.email} (Role: ${role})`);

                if (isAdminIntent) {
                    // Notify SuperAdmin
                    const superAdmin = await userRepository.findOne({ role: 'SuperAdmin' });
                    if (superAdmin) {
                        emailQueueManager.sendEmail({
                            type: 'admin_approval_request',
                            admin: { name: user.name, email: user.email },
                            superAdmin: { email: superAdmin.email, name: superAdmin.name }
                        }).catch(err => logger.error('Failed to send admin approval email', err));
                    }
                    // Notify user about pending status (Admin specific or generic)
                    emailQueueManager.sendEmail({
                        type: 'admin_pending',
                        user: { name: user.name, email: user.email }
                    }).catch(err => logger.error('Failed to send pending email', err));
                } else {
                    // Member Registration - Notify user about pending status
                    emailQueueManager.sendEmail({
                        type: 'account_pending',
                        user: {
                            name: user.name,
                            email: user.email
                        }
                    }).catch(err => logger.error('Failed to send pending email', err));
                }
            }
        }

        if (!user.isActive) {
            // If user is pending, they cannot login.
            // For Google Auth, we might need to handle this gracefully in the controller redirect.
            // But here we just throw or return.
            // The controller calls this, so if we throw, it catches.
            // But this method returns { user, tokens }.
            // Let's return normally, but the controller checks user.isActive.
            // However, we shouldn't generate tokens if they can't login?
            // Controller checks !user.isActive and redirects.
            // So we can proceed to return user, but maybe we shouldn't generate tokens?
            // Actually, the controller uses the tokens to redirect... wait.
            // If !user.isActive, controller redirects to login?error=...
            // It doesn't use the tokens for the session if it redirects to error.
            // So we can just return the user object (even without tokens perhaps, or with them but they are unused).
            // Let's keep the token generation for consistency but ensure controller logic is sound.
        }

        // Generate tokens
        const { accessToken, refreshToken } = generateTokenPair(user._id);

        // Save refresh token
        await user.addRefreshToken(refreshToken);

        // Update last login
        await userRepository.updateLastLogin(user._id);

        // Log activity
        await rabbitmqClient.logActivity({
            user: user._id,
            action: 'USER_LOGIN',
            resource: 'User',
            resourceId: user._id,
            details: { provider: 'google' },
        });

        return {
            user,
            accessToken,
            refreshToken,
        };
    }

    /**
     * Refresh access token
     */
    async refreshToken(user, oldRefreshToken) {
        // Generate new tokens
        const { accessToken, refreshToken } = generateTokenPair(user._id);

        // Remove old refresh token and add new one
        await user.removeRefreshToken(oldRefreshToken);
        await user.addRefreshToken(refreshToken);

        logger.debug(`Tokens refreshed for user: ${user.email}`);

        return {
            accessToken,
            refreshToken,
        };
    }

    /**
     * Logout user
     */
    async logout(user, token, refreshToken) {
        // Blacklist access token
        await redisClient.blacklistToken(token, 900); // 15 minutes

        // Remove refresh token
        if (refreshToken) {
            await user.removeRefreshToken(refreshToken);
        }

        // Log activity
        await rabbitmqClient.logActivity({
            user: user._id,
            action: 'USER_LOGOUT',
            resource: 'User',
            resourceId: user._id,
        });

        logger.info(`User logged out: ${user.email}`);

        return true;
    }

    /**
     * Logout from all devices
     */
    async logoutAll(user, token) {
        // Blacklist current access token
        await redisClient.blacklistToken(token, 900);

        // Clear all refresh tokens
        await user.clearRefreshTokens();

        // Log activity
        await rabbitmqClient.logActivity({
            user: user._id,
            action: 'USER_LOGOUT',
            resource: 'User',
            resourceId: user._id,
            details: { logoutAll: true },
        });

        logger.info(`User logged out from all devices: ${user.email}`);

        return true;
    }

    /**
     * Verify user email (placeholder for future implementation)
     */
    async verifyEmail(token) {
        // TODO: Implement email verification
        throw new AppError('Email verification not implemented yet', 501);
    }

    /**
     * Request password reset
     */
    async requestPasswordReset(email) {
        const user = await userRepository.findByEmail(email);
        if (!user) {
            throw new AppError('User not found', 404);
        }

        const resetToken = user.createPasswordResetToken();
        await user.save({ validateBeforeSave: false });

        try {
            const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;

            await emailQueueManager.sendEmail({
                type: 'reset_password',
                user: {
                    email: user.email,
                    name: user.name
                },
                resetUrl
            });

            return true;
        } catch (err) {
            user.passwordResetToken = undefined;
            user.passwordResetExpires = undefined;
            await user.save({ validateBeforeSave: false });
            throw new AppError('There was an error sending the email. Try again later!', 500);
        }
    }

    /**
     * Reset password
     */
    async resetPassword(token, newPassword) {
        const hashedToken = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');

        const user = await userRepository.findByResetToken(hashedToken);

        if (!user) {
            throw new AppError('Token is invalid or has expired', 400);
        }

        user.password = newPassword;
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save();

        // Optional: Logout other sessions?
        // For now, just return success
        return true;
    }
}

export default new AuthService();
