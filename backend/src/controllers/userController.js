import userService from '../services/userService.js';
import redisClient from '../config/redis.js';
import { asyncHandler } from '../middleware/errorHandler.js';

class UserController {
    getAllUsers = asyncHandler(async (req, res) => {
        const { page, limit } = req.pagination;
        const filters = req.filters || {};
        const sort = req.sort || { createdAt: -1 };

        let result = await userService.getAllUsers(filters, { page, limit, sort });

        // Add online status from Redis
        const userList = Array.isArray(result) ? result : (result.users || result.data || []);
        if (userList.length > 0) {
            const userIds = userList.map(u => u._id.toString());
            const onlineStatuses = await redisClient.getOnlineUsers(userIds);

            const usersWithStatus = userList.map(u => {
                const userObj = u.toObject ? u.toObject() : u;
                return {
                    ...userObj,
                    isOnline: onlineStatuses[u._id.toString()] === 'online'
                };
            });

            if (Array.isArray(result)) {
                result = usersWithStatus;
            } else if (result.users) {
                result.users = usersWithStatus;
            } else {
                result.data = usersWithStatus;
            }
        }

        res.json({
            success: true,
            data: result,
        });
    });

    getPendingAdmins = asyncHandler(async (req, res) => {
        const admins = await userService.getPendingAdmins();
        res.json({ success: true, data: admins });
    });

    getPendingMembers = asyncHandler(async (req, res) => {
        const members = await userService.getPendingMembers();
        res.json({ success: true, data: members });
    });

    approveAdmin = asyncHandler(async (req, res) => {
        const user = await userService.approveAdmin(req.params.id, req.user);
        res.json({ success: true, message: 'Admin approved successfully', data: { user } });
    });

    getUserById = asyncHandler(async (req, res) => {
        const user = await userService.getUserById(req.params.id);

        res.json({
            success: true,
            data: { user },
        });
    });

    createUser = asyncHandler(async (req, res) => {
        const user = await userService.createUser(req.body, req.user._id);

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            data: { user },
        });
    });

    updateUser = asyncHandler(async (req, res) => {
        const user = await userService.updateUser(req.params.id, req.body, req.user);

        res.json({
            success: true,
            message: 'User updated successfully',
            data: { user },
        });
    });

    deleteUser = asyncHandler(async (req, res) => {
        await userService.deleteUser(req.params.id, req.user._id);

        res.json({
            success: true,
            message: 'User deleted successfully',
        });
    });

    deactivateUser = asyncHandler(async (req, res) => {
        const user = await userService.deactivateUser(req.params.id, req.user._id);

        res.json({
            success: true,
            message: 'User deactivated successfully',
            data: { user },
        });
    });

    activateUser = asyncHandler(async (req, res) => {
        const user = await userService.activateUser(req.params.id, req.user._id);

        res.json({
            success: true,
            message: 'User activated successfully',
            data: { user },
        });
    });

    searchUsers = asyncHandler(async (req, res) => {
        const { q } = req.query;
        const { page, limit } = req.pagination;

        const result = await userService.searchUsers(q, { page, limit });

        res.json({
            success: true,
            data: result,
        });
    });

    getUserStats = asyncHandler(async (req, res) => {
        const stats = await userService.getUserStats();

        res.json({
            success: true,
            data: { stats },
        });
    });

    updateUserProfile = asyncHandler(async (req, res) => {
        const user = await userService.updateUserProfile(req.user._id, req.body);
        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: { user },
        });
    });
}

export default new UserController();
