import taskRepository from '../repositories/taskRepository.js';
import projectRepository from '../repositories/projectRepository.js';
import rabbitmqClient from '../config/rabbitmq.js';
import emailQueueManager from '../utils/emailQueueManager.js';
import { AppError } from '../middleware/errorHandler.js';
import logger from '../config/logger.js';

class TaskService {
    async createTask(taskData, createdBy, socketIO) {
        // STRICT RBAC: Manager and SuperAdmin can create tasks for anyone
        // Members can ONLY create tasks for themselves
        // Admins CANNOT create tasks (unless they are authorized for the project)

        if (createdBy.role === 'Member') {
            // Members can only create tasks assigned to themselves
            if (!taskData.assignedTo || taskData.assignedTo.length === 0) {
                taskData.assignedTo = [createdBy._id];
            } else if (taskData.assignedTo.length !== 1 || taskData.assignedTo[0].toString() !== createdBy._id.toString()) {
                throw new AppError('Members can only create tasks for themselves', 403);
            }
        } else if (createdBy.role === 'Admin') {
            throw new AppError('Admins cannot create tasks. Only Managers and SuperAdmins can create tasks', 403);
        } else if (createdBy.role !== 'Manager' && createdBy.role !== 'SuperAdmin') {
            throw new AppError('Only Managers and SuperAdmins can create tasks', 403);
        }

        // Verify project exists and is not archived
        const project = await projectRepository.findById(taskData.project);
        if (!project) {
            throw new AppError('Project not found', 404);
        }

        if (project.status === 'Archived') {
            throw new AppError('Cannot create tasks in an archived project', 403);
        }

        const task = await taskRepository.create({
            ...taskData,
            createdBy,
        });

        // Populate task for response
        const populatedTask = await taskRepository.findById(task._id, [
            'project',
            'assignedTo',
            'createdBy',
        ]);

        // Publish event to RabbitMQ
        await rabbitmqClient.publishTaskCreated(populatedTask);

        // Emit real-time event via Socket.IO
        if (socketIO) {
            socketIO.to(`project:${taskData.project}`).emit('task:created', populatedTask);
        }

        // Log activity
        await rabbitmqClient.logActivity({
            user: createdBy,
            action: 'TASK_CREATED',
            resource: 'Task',
            resourceId: task._id,
            details: { title: task.title, project: taskData.project },
        });

        // Send emails to assignees (only if assigned to others)
        if (populatedTask.assignedTo && Array.isArray(populatedTask.assignedTo) && populatedTask.assignedTo.length > 0) {
            populatedTask.assignedTo.forEach(async (assignee) => {
                // Don't send email if assigned to self
                if (assignee._id.toString() === createdBy._id.toString()) return;

                try {
                    await emailQueueManager.sendEmail({
                        type: 'task_assignment',
                        to: assignee.email,
                        user: { name: assignee.name, email: assignee.email },
                        task: {
                            title: task.title,
                            description: task.description,
                            priority: task.priority,
                            dueDate: task.dueDate
                        },
                        project: { name: project.name }
                    });
                } catch (error) {
                    logger.error(`Failed to send task assignment email for ${assignee.email}:`, error);
                }
            });
        }

        logger.info(`Task created: ${task.title} by ${createdBy}`);
        return populatedTask;
    }

    async getTaskById(id) {
        const task = await taskRepository.findById(id, [
            'project',
            'assignedTo',
            'createdBy',
            'comments.user',
        ]);
        if (!task) {
            throw new AppError('Task not found', 404);
        }
        return task;
    }

    async getProjectTasks(projectId, options = {}) {
        return await taskRepository.findByProject(projectId, {
            ...options,
            populate: ['assignedTo', 'createdBy'],
        });
    }

    async getUserTasks(user, options = {}) {
        // RBAC LOGIC:
        // SuperAdmin: See ALL tasks (full access)
        // Admin: See ALL tasks (read-only unless authorized for project)
        // Manager: See ONLY tasks in projects they OWN
        // Member: See only tasks assigned to them

        if (user.role === 'SuperAdmin') {
            // SuperAdmin sees everything
            const result = await taskRepository.findAll({}, {
                ...options,
                populate: ['project', 'createdBy', 'assignedTo'],
            });
            return result.tasks || [];
        } else if (user.role === 'Admin') {
            // Admin sees ALL tasks for global visibility
            const result = await taskRepository.findAll({}, {
                ...options,
                populate: ['project', 'createdBy', 'assignedTo'],
            });
            return result.tasks || [];
        } else if (user.role === 'Manager') {
            // Manager sees only tasks in projects they OWN
            // First get all projects owned by this manager
            const projectsResult = await projectRepository.findAll({ owner: user._id });
            const projects = projectsResult.projects || [];
            const projectIds = projects.map(p => p._id);

            // Then get all tasks in those projects
            const result = await taskRepository.findAll({ project: { $in: projectIds } }, {
                ...options,
                populate: ['project', 'createdBy', 'assignedTo'],
            });
            return result.tasks || [];
        } else {
            // Member: See only tasks assigned to them
            const result = await taskRepository.findByAssignee(user._id, {
                ...options,
                populate: ['project', 'createdBy', 'assignedTo'],
            });
            return result.tasks || [];
        }
    }

    async updateTask(id, updateData, updatedBy, socketIO) {

        const task = await taskRepository.findById(id, ['project']);
        if (!task) {
            throw new AppError('Task not found', 404);
        }

        // Check if project is archived
        const project = await projectRepository.findById(task.project._id);
        if (project.status === 'Archived') {
            throw new AppError('Cannot update tasks in an archived project', 403);
        }

        // RBAC: Check project membership
        const isSuperAdmin = updatedBy.role === 'SuperAdmin';
        const isMember = project.members.some(m => m.user.toString() === updatedBy._id.toString()) ||
            project.owner.toString() === updatedBy._id.toString();

        if (!isSuperAdmin && !isMember) {
            throw new AppError('Not authorized to access this project', 403);
        }

        const oldStatus = task.status;
        const updatedTask = await taskRepository.update(id, updateData, updatedBy);

        // Populate for response
        const populatedTask = await taskRepository.findById(id, [
            'project',
            'assignedTo',
            'createdBy',
        ]);

        // Track changes for event
        const changes = {};
        Object.keys(updateData).forEach(key => {
            if (task[key] !== updateData[key]) {
                changes[key] = { old: task[key], new: updateData[key] };
            }
        });

        // Publish event to RabbitMQ
        await rabbitmqClient.publishTaskUpdated(populatedTask, changes);

        // Emit real-time event via Socket.IO
        if (socketIO) {
            socketIO.to(`project:${task.project._id}`).emit('task:updated', populatedTask);

            // Special event for status change
            if (updateData.status && oldStatus !== updateData.status) {
                socketIO.to(`project:${task.project._id}`).emit('task:status-changed', {
                    taskId: id,
                    oldStatus,
                    newStatus: updateData.status,
                });
            }
        }

        // Log activity
        await rabbitmqClient.logActivity({
            user: updatedBy,
            action: updateData.status ? 'TASK_STATUS_CHANGED' : 'TASK_UPDATED',
            resource: 'Task',
            resourceId: id,
            details: { changes },
        });

        logger.info(`Task updated: ${id} by ${updatedBy}`);
        return populatedTask;
    }

    async deleteTask(id, deletedBy, socketIO) {
        // RBAC: Members cannot delete tasks
        if (deletedBy.role === 'Member') {
            throw new AppError('Members cannot delete tasks', 403);
        }

        const task = await taskRepository.findById(id, ['project']);
        if (!task) {
            throw new AppError('Task not found', 404);
        }

        const project = await projectRepository.findById(task.project._id);

        // RBAC: Check project membership
        const isSuperAdmin = deletedBy.role === 'SuperAdmin';
        const isMember = project.members.some(m => m.user.toString() === deletedBy._id.toString()) ||
            project.owner.toString() === deletedBy._id.toString();

        if (!isSuperAdmin && !isMember) {
            throw new AppError('Not authorized to access this project', 403);
        }

        await taskRepository.delete(id);

        // Publish event to RabbitMQ
        await rabbitmqClient.publishTaskDeleted(id);

        // Emit real-time event via Socket.IO
        if (socketIO) {
            socketIO.to(`project:${task.project._id}`).emit('task:deleted', { taskId: id });
        }

        // Log activity
        await rabbitmqClient.logActivity({
            user: deletedBy,
            action: 'TASK_DELETED',
            resource: 'Task',
            resourceId: id,
            details: { title: task.title },
        });

        logger.info(`Task deleted: ${id} by ${deletedBy}`);
        return true;
    }

    async updateTaskStatus(id, status, lateReason, updatedBy, socketIO) {
        const updateData = { status };
        if (lateReason !== undefined) updateData.lateReason = lateReason;
        return await this.updateTask(id, updateData, updatedBy, socketIO);
    }

    async assignTask(id, assignedTo, assignedBy, socketIO) {
        const updatedTask = await this.updateTask(id, { assignedTo }, assignedBy, socketIO);

        await rabbitmqClient.logActivity({
            user: assignedBy,
            action: 'TASK_ASSIGNED',
            resource: 'Task',
            resourceId: id,
            details: { assignedTo },
        });

        return updatedTask;
    }

    async addComment(taskId, userId, text, socketIO) {
        const task = await taskRepository.addComment(taskId, userId, text);
        if (!task) {
            throw new AppError('Task not found', 404);
        }

        const populatedTask = await taskRepository.findById(taskId, [
            'project',
            'assignedTo',
            'createdBy',
            'comments.user',
        ]);

        // Emit real-time event
        if (socketIO) {
            socketIO.to(`project:${task.project}`).emit('task:comment-added', {
                taskId,
                comment: populatedTask.comments[populatedTask.comments.length - 1],
            });
        }

        await rabbitmqClient.logActivity({
            user: userId,
            action: 'TASK_COMMENT_ADDED',
            resource: 'Task',
            resourceId: taskId,
            details: { commentLength: text.length },
        });

        return populatedTask;
    }

    async searchTasks(searchTerm, filters = {}, options = {}) {
        return await taskRepository.search(searchTerm, filters, options);
    }

    async getOverdueTasks(projectId = null) {
        return await taskRepository.getOverdueTasks(projectId);
    }

    async getTasksDueSoon(projectId, days = 7) {
        return await taskRepository.getTasksDueSoon(projectId, days);
    }

    async getTaskStats(projectId) {
        return await taskRepository.getTaskStats(projectId);
    }

    async getUserTaskStats(user) {
        if (user.role === 'SuperAdmin' || user.role === 'Admin') {
            return await taskRepository.getDashboardStats({});
        } else if (user.role === 'Manager') {
            const projectsResult = await projectRepository.findAll({ owner: user._id });
            const projects = projectsResult.projects || [];
            const projectIds = projects.map(p => p._id);
            return await taskRepository.getDashboardStats({ project: { $in: projectIds } });
        } else {
            return await taskRepository.getDashboardStats({ assignedTo: user._id });
        }
    }

    async bulkUpdateStatus(taskIds, status, userId, socketIO) {
        const tasks = await taskRepository.bulkUpdateStatus(taskIds, status, userId);

        // Emit real-time events for each task
        if (socketIO) {
            for (const task of tasks) {
                socketIO.to(`project:${task.project}`).emit('task:status-changed', {
                    taskId: task._id,
                    newStatus: status,
                });
            }
        }

        return tasks;
    }
}

export default new TaskService();
