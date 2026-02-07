import ActivityLog from '../models/ActivityLog.js';

class ActivityLogRepository {
    async create(logData) {
        const log = new ActivityLog(logData);
        return await log.save();
    }

    async findAll(filters = {}, options = {}) {
        const { page = 1, limit = 50, sort = { createdAt: -1 } } = options;
        const skip = (page - 1) * limit;

        const logs = await ActivityLog.find(filters)
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .populate('user', 'name email')
            .exec();

        const total = await ActivityLog.countDocuments(filters);

        return {
            logs,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        };
    }

    async findByUser(userId, options = {}) {
        return await this.findAll({ user: userId }, options);
    }

    async findByResource(resource, resourceId, options = {}) {
        return await this.findAll({ resource, resourceId }, options);
    }

    async findByAction(action, options = {}) {
        return await this.findAll({ action }, options);
    }

    async findByProject(projectId, options = {}) {
        return await this.findAll(
            {
                resource: 'Project',
                resourceId: projectId,
            },
            options
        );
    }

    async findByTask(taskId, options = {}) {
        return await this.findAll(
            {
                resource: 'Task',
                resourceId: taskId,
            },
            options
        );
    }

    async getRecentActivity(limit = 20) {
        return await ActivityLog.find()
            .sort({ createdAt: -1 })
            .limit(limit)
            .populate('user', 'name email')
            .exec();
    }

    async getUserActivity(userId, days = 30) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        return await ActivityLog.find({
            user: userId,
            createdAt: { $gte: startDate },
        })
            .sort({ createdAt: -1 })
            .populate('user', 'name email')
            .exec();
    }

    async getActivityStats(userId = null, days = 30) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const matchStage = {
            createdAt: { $gte: startDate },
        };

        if (userId) {
            matchStage.user = userId;
        }

        const stats = await ActivityLog.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: '$action',
                    count: { $sum: 1 },
                },
            },
            { $sort: { count: -1 } },
        ]);

        return stats;
    }

    async deleteOldLogs(days = 90) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);

        const result = await ActivityLog.deleteMany({
            createdAt: { $lt: cutoffDate },
        });

        return result.deletedCount;
    }
}

export default new ActivityLogRepository();
