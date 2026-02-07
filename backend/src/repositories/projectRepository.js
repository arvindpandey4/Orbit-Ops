import Project from '../models/Project.js';
import redisClient from '../config/redis.js';
import logger from '../config/logger.js';

class ProjectRepository {
    async create(projectData) {
        const project = new Project(projectData);
        await project.save();

        // Invalidate user's project cache
        await this.clearUserCache(projectData.owner);

        return project;
    }

    async findById(id, populate = []) {
        const cacheKey = `project:${id}:${JSON.stringify(populate)}`;
        const cachedProject = await redisClient.get(cacheKey);

        if (cachedProject) {
            return JSON.parse(cachedProject);
        }

        let query = Project.findById(id);

        if (populate.length > 0) {
            populate.forEach(field => {
                query = query.populate(field);
            });
        }

        const project = await query.exec();

        if (project) {
            await redisClient.set(cacheKey, JSON.stringify(project), 300); // Cache for 5 minutes
        }

        return project;
    }

    async findAll(filters = {}, options = {}) {
        // Caching lists is complex due to filters/pagination. 
        // We'll focus on caching for specific high-volume queries or rely on database performance for filtered lists.
        // Or implement a simple TTL cache for lists if filters are standard.

        const { page = 1, limit = 20, sort = { createdAt: -1 }, populate = [] } = options;
        const skip = (page - 1) * limit;

        let query = Project.find(filters)
            .sort(sort)
            .skip(skip)
            .limit(limit);

        if (populate.length > 0) {
            populate.forEach(field => {
                query = query.populate(field);
            });
        }

        const projects = await query.exec();
        const total = await Project.countDocuments(filters);

        return {
            projects,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        };
    }

    async findByUser(userId, options = {}) {
        const cacheKey = `user_projects:${userId}:${JSON.stringify(options)}`;
        const cachedProjects = await redisClient.get(cacheKey);

        if (cachedProjects) {
            return JSON.parse(cachedProjects);
        }

        const filters = {
            $or: [
                { owner: userId },
                { 'members.user': userId },
            ],
        };
        const result = await this.findAll(filters, options);

        await redisClient.set(cacheKey, JSON.stringify(result), 60); // Cache list for 1 minute
        return result;
    }

    async findByOwner(ownerId, options = {}) {
        return await this.findAll({ owner: ownerId }, options);
    }

    async findActiveProjects(userId, options = {}) {
        const filters = {
            status: 'Active',
            $or: [
                { owner: userId },
                { 'members.user': userId },
            ],
        };
        return await this.findAll(filters, options);
    }

    async update(id, updateData) {
        const project = await Project.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        );
        if (project) {
            await this.clearProjectCache(id);
            await this.clearUserCache(project.owner);
        }
        return project;
    }

    async delete(id) {
        const project = await Project.findByIdAndDelete(id);
        if (project) {
            await this.clearProjectCache(id);
            await this.clearUserCache(project.owner);
        }
        return project;
    }

    async archive(id, userId) {
        const project = await Project.findByIdAndUpdate(
            id,
            {
                status: 'Archived',
                archivedAt: new Date(),
                archivedBy: userId,
            },
            { new: true }
        );
        if (project) await this.clearProjectCache(id);
        return project;
    }

    async unarchive(id) {
        const project = await Project.findByIdAndUpdate(
            id,
            {
                status: 'Active',
                archivedAt: null,
                archivedBy: null,
            },
            { new: true }
        );
        if (project) await this.clearProjectCache(id);
        return project;
    }

    async addMember(projectId, userId, role, addedBy) {
        const project = await this.findById(projectId);
        if (!project) return null;

        await project.addMember(userId, role, addedBy);
        await this.clearProjectCache(projectId);
        await this.clearUserCache(userId);
        return project;
    }

    async removeMember(projectId, userId) {
        const project = await this.findById(projectId);
        if (!project) return null;

        await project.removeMember(userId);
        await this.clearProjectCache(projectId);
        await this.clearUserCache(userId);
        return project;
    }

    async updateMemberRole(projectId, userId, newRole) {
        const project = await this.findById(projectId);
        if (!project) return null;

        await project.updateMemberRole(userId, newRole);
        await this.clearProjectCache(projectId);
        return project;
    }

    async clearProjectCache(projectId) {
        try {
            const keys = await redisClient.keys(`project:${projectId}:*`);
            if (keys.length > 0) {
                await redisClient.del(keys);
            }
        } catch (error) {
            logger.error(`Failed to clear project cache for ${projectId}:`, error);
        }
    }

    async clearUserCache(userId) {
        try {
            const keys = await redisClient.keys(`user_projects:${userId}:*`);
            if (keys.length > 0) {
                await redisClient.del(keys);
            }
        } catch (error) {
            logger.error(`Failed to clear user cache for ${userId}:`, error);
        }
    }

    async search(searchTerm, userId, options = {}) {
        const { page = 1, limit = 20 } = options;
        const skip = (page - 1) * limit;

        const searchQuery = {
            $and: [
                {
                    $or: [
                        { owner: userId },
                        { 'members.user': userId },
                    ],
                },
                {
                    $or: [
                        { name: { $regex: searchTerm, $options: 'i' } },
                        { description: { $regex: searchTerm, $options: 'i' } },
                        { tags: { $in: [new RegExp(searchTerm, 'i')] } },
                    ],
                },
            ],
        };

        const projects = await Project.find(searchQuery)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('owner', 'name email')
            .populate('members.user', 'name email');

        const total = await Project.countDocuments(searchQuery);

        return {
            projects,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        };
    }

    async getProjectStats(projectId) {
        const Task = (await import('../models/Task.js')).default;

        const stats = await Task.aggregate([
            { $match: { project: projectId } },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                },
            },
        ]);

        return {
            total: stats.reduce((sum, stat) => sum + stat.count, 0),
            byStatus: stats.reduce((acc, stat) => {
                acc[stat._id] = stat.count;
                return acc;
            }, {}),
        };
    }
}

export default new ProjectRepository();
