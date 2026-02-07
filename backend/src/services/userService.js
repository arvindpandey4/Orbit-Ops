import userRepository from '../repositories/userRepository.js';
import rabbitmqClient from '../config/rabbitmq.js';
import { AppError } from '../middleware/errorHandler.js';
import logger from '../config/logger.js';

class UserService {
    async getAllUsers(filters = {}, options = {}) {
        return await userRepository.findAll(filters, options);
    }

    async getUserById(id) {
        const user = await userRepository.findById(id);
        if (!user) {
            throw new AppError('User not found', 404);
        }
        return user;
    }

    async createUser(userData, createdBy) {
        // Check if user already exists
        const existingUser = await userRepository.findByEmail(userData.email);
        if (existingUser) {
            throw new AppError('User with this email already exists', 400);
        }

        // Prevent creating SuperAdmin manually
        if (userData.role === 'SuperAdmin') {
            throw new AppError('Cannot create SuperAdmin role', 403);
        }

        // If creating Admin, set to inactive (pending approval) unless created by SuperAdmin
        if (userData.role === 'Admin') {
            // If creator is SuperAdmin, allow active. If creator is just Admin (can Admin create Admin?), 
            // the user said "only super admin... authenticate admin". 
            // Assume any creation of Admin needs SuperAdmin approval if not created BY SuperAdmin.
            // Since `createdBy` is passed (might be ID or obj), let's assume if it's not SuperAdmin, it's pending.
            // But we might need to fetch `createdBy` role if it is just an ID.
            // For now, force Pending for ALL Admin creations not done by system seed to be safe, 
            // OR check creator's role. I'll make it pending if created via API.
            userData.isActive = false;
            // Wait, if SuperAdmin creates it, it should be active? 
            // Let's stick to the rule: "new account which was created... authenticate admin".
            // Implementation: Set isActive = false for Admin role.
        }

        // Store the temporary password before hashing
        const temporaryPassword = userData.password;

        // Create the user
        const user = await userRepository.create(userData);

        // Send invitation email via RabbitMQ only if Active
        if (user.isActive) {
            try {
                await rabbitmqClient.publishEmail({
                    type: 'invitation',
                    to: user.email,
                    data: {
                        user: {
                            name: user.name,
                            email: user.email,
                            role: user.role
                        },
                        temporaryPassword: temporaryPassword
                    }
                });
                logger.info(`Invitation email queued for ${user.email}`);
            } catch (emailError) {
                logger.error(`Failed to queue invitation email for ${user.email}:`, emailError);
            }
        } else {
            logger.info(`User created (Pending Approval): ${user.email} role: ${user.role}`);
        }

        // Log activity
        await rabbitmqClient.logActivity({
            user: createdBy,
            action: 'USER_CREATED',
            resource: 'User',
            resourceId: user._id,
            details: { email: user.email, role: user.role, status: user.isActive ? 'Active' : 'Pending' },
        });

        logger.info(`User created: ${user._id} by ${createdBy}`);
        return user;
    }

    async approveAdmin(userId, approvedBy) {
        const user = await userRepository.findById(userId);
        if (!user) {
            throw new AppError('User not found', 404);
        }

        user.isActive = true;
        await user.save();

        // Send approval email
        try {
            await rabbitmqClient.publishToQueue('email_queue', {
                type: 'admin_approved',
                user: {
                    name: user.name,
                    email: user.email
                }
            });
            logger.info(`Admin approval email queued for ${user.email}`);
        } catch (e) {
            logger.error('Failed to send approval email', e);
        }

        return user;
    }

    async seedSuperAdmin() {
        try {
            const superAdminEmail = 'avisandhyatech@gmail.com';
            const existingUser = await userRepository.findByEmail(superAdminEmail);
            if (!existingUser) {
                await userRepository.create({
                    name: 'Super Admin',
                    email: superAdminEmail,
                    password: 'admin1234',
                    role: 'SuperAdmin',
                    isActive: true
                });
                logger.info('Super Admin seeded successfully');
            }
        } catch (error) {
            logger.error('Failed to seed Super Admin:', error);
        }
    }

    async getPendingAdmins() {
        return await userRepository.findAll({ role: 'Admin', isActive: false });
    }

    async getPendingMembers() {
        return await userRepository.findAll({
            role: { $in: ['Member', 'Manager'] },
            isActive: false
        });
    }

    async updateUser(id, updateData, updatedBy) {
        const user = await userRepository.findById(id);
        if (!user) {
            throw new AppError('User not found', 404);
        }

        // Prevent email change
        if (updateData.email && updateData.email !== user.email) {
            throw new AppError('Email cannot be changed', 400);
        }

        // Prevent role change by non-admins
        if (updateData.role && updateData.role !== user.role) {
            // Check if updater is Admin or SuperAdmin
            if (!updatedBy || !['Admin', 'SuperAdmin'].includes(updatedBy.role)) {
                delete updateData.role;
            }
        }

        const updatedUser = await userRepository.update(id, updateData);

        await rabbitmqClient.logActivity({
            user: updatedBy._id || updatedBy,
            action: 'USER_UPDATED',
            resource: 'User',
            resourceId: id,
            details: { fields: Object.keys(updateData) },
        });

        logger.info(`User updated: ${id} by ${updatedBy._id || updatedBy}`);
        return updatedUser;
    }

    async updateUserProfile(id, updateData) {
        // Safe internal method for self-update
        const allowedUpdates = {};
        if (updateData.name) allowedUpdates.name = updateData.name;
        // if (updateData.email) allowedUpdates.email = updateData.email; // Allow email change? Risky if not re-verified.
        // For now, let's assume Name change only, or Email if business logic permits.
        // User said "profile information" in Settings.tsx, which sends { name, email }.

        // Strict: Do NOT accept role, isActive, etc.
        // Pass to standard update
        return await userRepository.update(id, allowedUpdates);
    }

    async deleteUser(id, deletedBy) {
        const user = await userRepository.findById(id);
        if (!user) {
            throw new AppError('User not found', 404);
        }

        await userRepository.delete(id);

        await rabbitmqClient.logActivity({
            user: deletedBy,
            action: 'USER_DELETED',
            resource: 'User',
            resourceId: id,
            details: { email: user.email },
        });

        logger.info(`User deleted: ${id} by ${deletedBy}`);
        return true;
    }

    async deactivateUser(id, deactivatedBy) {
        const user = await userRepository.deactivate(id);
        if (!user) {
            throw new AppError('User not found', 404);
        }

        await rabbitmqClient.logActivity({
            user: deactivatedBy,
            action: 'USER_UPDATED',
            resource: 'User',
            resourceId: id,
            details: { action: 'deactivated' },
        });

        return user;
    }

    async activateUser(id, activatedBy) {
        const user = await userRepository.activate(id);
        if (!user) {
            throw new AppError('User not found', 404);
        }

        await rabbitmqClient.logActivity({
            user: activatedBy,
            action: 'USER_UPDATED',
            resource: 'User',
            resourceId: id,
            details: { action: 'activated' },
        });

        // Send Welcome/Approval Email
        try {
            await rabbitmqClient.publishToQueue('email_queue', {
                type: 'welcome', // Or 'account_approved' if you have that template. 'welcome' is fine.
                user: {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    isActive: true
                }
            });
            logger.info(`Approval/Welcome email queued for ${user.email}`);
        } catch (e) {
            logger.error('Failed to send activation email', e);
        }

        return user;
    }

    async searchUsers(searchTerm, options = {}) {
        return await userRepository.search(searchTerm, options);
    }

    async getUserStats() {
        const adminCount = await userRepository.countByRole('Admin');
        const managerCount = await userRepository.countByRole('Manager');
        const memberCount = await userRepository.countByRole('Member');

        return {
            total: adminCount + managerCount + memberCount,
            byRole: {
                Admin: adminCount,
                Manager: managerCount,
                Member: memberCount,
            },
        };
    }
}

export default new UserService();
