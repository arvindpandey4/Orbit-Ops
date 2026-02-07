import Task from '../models/Task.js';
import mongoose from 'mongoose';
import redisClient from '../config/redis.js';
import logger from '../config/logger.js';

class TaskRepository {
    async create(taskData) {
        const task = new Task(taskData);
        await task.save();
        await this.clearTaskCache(task._id, task.project);
        return task;
    }

    async findById(id, populate = []) {
        const cacheKey = `task:${id}:${JSON.stringify(populate)}`;
        const cachedTask = await redisClient.get(cacheKey);

        if (cachedTask) {
            return JSON.parse(cachedTask);
        }

        let query = Task.findById(id);

        if (populate.length > 0) {
            populate.forEach(field => {
                query = query.populate(field);
            });
        }

        const task = await query.exec();

        if (task) {
            await redisClient.set(cacheKey, JSON.stringify(task), 300); // 5 minutes
        }

        return task;
    }

    async findAll(filters = {}, options = {}) {
        const { page = 1, limit = 20, sort = { createdAt: -1 }, populate = [] } = options;
        const skip = (page - 1) * limit;

        let query = Task.find(filters)
            .sort(sort)
            .skip(skip)
            .limit(limit);

        if (populate.length > 0) {
            populate.forEach(field => {
                query = query.populate(field);
            });
        }

        const tasks = await query.exec();
        const total = await Task.countDocuments(filters);

        return {
            tasks,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        };
    }

    async findByProject(projectId, options = {}) {
        const cacheKey = `project_tasks:${projectId}:${JSON.stringify(options)}`;
        const cachedTasks = await redisClient.get(cacheKey);

        if (cachedTasks) {
            return JSON.parse(cachedTasks);
        }

        const result = await this.findAll({ project: projectId }, options);
        await redisClient.set(cacheKey, JSON.stringify(result), 60); // 1 minute
        return result;
    }

    async findByAssignee(userId, options = {}) {
        return await this.findAll({
            $or: [
                { assignedTo: userId },
                { createdBy: userId }
            ]
        }, options);
    }

    async findByStatus(status, options = {}) {
        return await this.findAll({ status }, options);
    }

    async findByProjectAndStatus(projectId, status, options = {}) {
        return await this.findAll({ project: projectId, status }, options);
    }

    async update(id, updateData, userId) {
        const task = await Task.findById(id);
        if (!task) return null;

        // Store who made the change
        task._changedBy = userId;

        // Track changes for specific fields
        const trackedFields = ['status', 'assignedTo', 'priority', 'dueDate'];
        trackedFields.forEach(field => {
            if (updateData[field] !== undefined && task[field] !== updateData[field]) {
                task.trackChange(field, task[field], updateData[field], userId);
            }
        });

        // Apply updates
        Object.assign(task, updateData);

        await task.save();
        await this.clearTaskCache(id, task.project);
        return task;
    }

    async delete(id) {
        const task = await Task.findByIdAndDelete(id);
        if (task) {
            await this.clearTaskCache(id, task.project);
        }
        return task;
    }

    async addComment(taskId, userId, text) {
        const task = await this.findById(taskId);
        if (!task) return null;

        await task.addComment(userId, text);
        await this.clearTaskCache(taskId, task.project);
        return task;
    }

    async updateStatus(id, status, userId) {
        return await this.update(id, { status }, userId);
    }

    async assignTask(id, assignedTo, userId) {
        return await this.update(id, { assignedTo }, userId);
    }

    async clearTaskCache(taskId, projectId) {
        try {
            const keys = await redisClient.keys(`task:${taskId}:*`);
            if (keys.length > 0) {
                await redisClient.del(keys);
            }

            if (projectId) {
                const projectKeys = await redisClient.keys(`project_tasks:${projectId}:*`);
                if (projectKeys.length > 0) {
                    await redisClient.del(projectKeys);
                }
            }
        } catch (error) {
            logger.error(`Failed to clear task cache for ${taskId}:`, error);
        }
    }

    async search(searchTerm, filters = {}, options = {}) {
        const { page = 1, limit = 20 } = options;
        const skip = (page - 1) * limit;

        const searchQuery = {
            ...filters,
            $or: [
                { title: { $regex: searchTerm, $options: 'i' } },
                { description: { $regex: searchTerm, $options: 'i' } },
                { tags: { $in: [new RegExp(searchTerm, 'i')] } },
            ],
        };

        const tasks = await Task.find(searchQuery)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('project', 'name')
            .populate('assignedTo', 'name email')
            .populate('createdBy', 'name email');

        const total = await Task.countDocuments(searchQuery);

        return {
            tasks,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        };
    }

    async getOverdueTasks(projectId = null) {
        const filters = {
            status: { $ne: 'Done' },
            dueDate: { $lt: new Date() },
        };

        if (projectId) {
            filters.project = projectId;
        }

        return await Task.find(filters)
            .populate('project', 'name')
            .populate('assignedTo', 'name email')
            .sort({ dueDate: 1 });
    }

    async getTasksByPriority(projectId, priority) {
        return await this.findAll(
            { project: projectId, priority },
            { sort: { createdAt: -1 } }
        );
    }

    async getTasksDueSoon(projectId, days = 7) {
        const today = new Date();
        const futureDate = new Date();
        futureDate.setDate(today.getDate() + days);

        const filters = {
            project: projectId,
            status: { $ne: 'Done' },
            dueDate: {
                $gte: today,
                $lte: futureDate,
            },
        };

        return await Task.find(filters)
            .populate('assignedTo', 'name email')
            .sort({ dueDate: 1 });
    }

    async getTaskStats(projectId) {
        const stats = await Task.aggregate([
            { $match: { project: new mongoose.Types.ObjectId(projectId) } },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    todo: {
                        $sum: { $cond: [{ $eq: ['$status', 'Todo'] }, 1, 0] },
                    },
                    inProgress: {
                        $sum: { $cond: [{ $eq: ['$status', 'In Progress'] }, 1, 0] },
                    },
                    done: {
                        $sum: { $cond: [{ $eq: ['$status', 'Done'] }, 1, 0] },
                    },
                    overdue: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $ne: ['$status', 'Done'] },
                                        { $lt: ['$dueDate', new Date()] },
                                    ],
                                },
                                1,
                                0,
                            ],
                        },
                    },
                },
            },
        ]);

        return stats[0] || {
            total: 0,
            todo: 0,
            inProgress: 0,
            done: 0,
            overdue: 0,
        };
    }

    async getDashboardStats(filter) {
        const stats = await Task.aggregate([
            { $match: filter },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    todo: {
                        $sum: { $cond: [{ $eq: ['$status', 'Todo'] }, 1, 0] },
                    },
                    inProgress: {
                        $sum: { $cond: [{ $eq: ['$status', 'In Progress'] }, 1, 0] },
                    },
                    done: {
                        $sum: { $cond: [{ $eq: ['$status', 'Done'] }, 1, 0] },
                    },
                    overdue: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $ne: ['$status', 'Done'] },
                                        { $lt: ['$dueDate', new Date()] },
                                    ],
                                },
                                1,
                                0,
                            ],
                        },
                    },
                },
            },
        ]);

        return stats[0] || {
            total: 0,
            todo: 0,
            inProgress: 0,
            done: 0,
            overdue: 0,
        };
    }

    async bulkUpdateStatus(taskIds, status, userId) {
        const tasks = await Task.find({ _id: { $in: taskIds } });

        const updates = tasks.map(task => {
            task._changedBy = userId;
            task.status = status;
            return task.save().then(() => {
                this.clearTaskCache(task._id, task.project);
            });
        });

        return await Promise.all(updates);
    }
}

export default new TaskRepository();
