import projectRepository from '../repositories/projectRepository.js';
import rabbitmqClient from '../config/rabbitmq.js';
import emailQueueManager from '../utils/emailQueueManager.js';
import { AppError } from '../middleware/errorHandler.js';
import logger from '../config/logger.js';

class ProjectService {
    async createProject(projectData, createdBy) {
        // STRICT RBAC: Only Manager and SuperAdmin can create projects
        if (createdBy.role !== 'Manager' && createdBy.role !== 'SuperAdmin') {
            throw new AppError('Only Managers and SuperAdmins can create projects', 403);
        }

        // Prepare members array
        const members = [{
            user: createdBy._id,
            role: 'Admin',
            addedBy: createdBy._id,
        }];

        // Add Authorized Admin if selected
        if (projectData.authorizedAdmin) {
            members.push({
                user: projectData.authorizedAdmin,
                role: 'Admin',
                addedBy: createdBy._id
            });
        }

        if (projectData.members && Array.isArray(projectData.members)) {
            projectData.members.forEach(memberId => {
                // Avoid duplicates for owner or authorized admin
                if (memberId.toString() !== createdBy._id.toString() &&
                    memberId.toString() !== projectData.authorizedAdmin) {
                    members.push({
                        user: memberId,
                        role: 'Member',
                        addedBy: createdBy._id
                    });
                }
            });
        }

        const project = await projectRepository.create({
            ...projectData,
            owner: createdBy._id,
            members,
        });

        // Fetch populated project to send emails
        const populatedProject = await projectRepository.findById(project._id, ['members.user']);

        // Send emails to new members
        populatedProject.members.forEach(async (member) => {
            if (member.user._id.toString() !== createdBy._id.toString()) {
                try {
                    await emailQueueManager.sendEmail({
                        type: 'project_assignment',
                        to: member.user.email,
                        user: { name: member.user.name, email: member.user.email },
                        project: { name: project.name },
                        addedBy: createdBy.name // Using name from createdBy object
                    });
                } catch (error) {
                    logger.error(`Failed to send project assignment email for ${member.user.email}:`, error);
                }
            }
        });

        await rabbitmqClient.logActivity({
            user: createdBy._id,
            action: 'PROJECT_CREATED',
            resource: 'Project',
            resourceId: project._id,
            details: { name: project.name, memberCount: members.length },
        });

        logger.info(`Project created: ${project.name} by ${createdBy._id}`);
        return project;
    }

    async getProjectById(id, populate = ['owner', 'members.user']) {
        const project = await projectRepository.findById(id, populate);
        if (!project) {
            throw new AppError('Project not found', 404);
        }
        return project;
    }

    async getUserProjects(user, options = {}) {
        // RBAC LOGIC:
        // SuperAdmin: See ALL projects (full access)
        // Admin: See ALL projects (read-only unless authorized)
        // Manager: See ONLY projects they OWN
        // Member: See only projects they are assigned to

        if (user.role === 'SuperAdmin') {
            // SuperAdmin sees everything
            const result = await projectRepository.findAll({}, {
                ...options,
                populate: ['owner', 'members.user'],
            });
            return result.projects || [];
        } else if (user.role === 'Admin') {
            // Admin sees ALL projects for visibility (but can only modify if authorized)
            const result = await projectRepository.findAll({}, {
                ...options,
                populate: ['owner', 'members.user'],
            });
            return result.projects || [];
        } else if (user.role === 'Manager') {
            // Manager sees ONLY projects they OWN
            const result = await projectRepository.findAll({ owner: user._id }, {
                ...options,
                populate: ['owner', 'members.user'],
            });
            return result.projects || [];
        } else {
            // Member: See only projects they are assigned to
            const result = await projectRepository.findByUser(user._id, {
                ...options,
                populate: ['owner', 'members.user'],
            });
            return result.projects || [];
        }
    }

    async getActiveProjects(userId, options = {}) {
        return await projectRepository.findActiveProjects(userId, {
            ...options,
            populate: ['owner', 'members.user'],
        });
    }

    async updateProject(id, updateData, updatedBy) {
        const project = await projectRepository.findById(id);
        if (!project) {
            throw new AppError('Project not found', 404);
        }

        // RBAC: Only Owner, SuperAdmin, or Authorized Project Admin can update
        const isOwner = project.owner.toString() === updatedBy._id.toString();
        const isSuperAdmin = updatedBy.role === 'SuperAdmin';
        // Check if user is an Admin in this project (Authorized Admin)
        const isProjectAdmin = project.members.some(
            m => m.user.toString() === updatedBy._id.toString() && m.role === 'Admin'
        );

        if (!isOwner && !isSuperAdmin && !isProjectAdmin) {
            throw new AppError('Not authorized to update this project', 403);
        }

        const updatedProject = await projectRepository.update(id, updateData);

        await rabbitmqClient.logActivity({
            user: updatedBy,
            action: 'PROJECT_UPDATED',
            resource: 'Project',
            resourceId: id,
            details: { fields: Object.keys(updateData) },
        });

        logger.info(`Project updated: ${id} by ${updatedBy}`);
        return updatedProject;
    }

    async deleteProject(id, deletedBy) {
        const project = await projectRepository.findById(id);
        if (!project) {
            throw new AppError('Project not found', 404);
        }

        // RBAC: Only Owner or SuperAdmin can delete
        const isOwner = project.owner.toString() === deletedBy._id.toString();
        const isSuperAdmin = deletedBy.role === 'SuperAdmin';

        if (!isOwner && !isSuperAdmin) {
            throw new AppError('Only Project Owner or SuperAdmin can delete projects', 403);
        }

        await projectRepository.delete(id);

        await rabbitmqClient.logActivity({
            user: deletedBy,
            action: 'PROJECT_DELETED',
            resource: 'Project',
            resourceId: id,
            details: { name: project.name },
        });

        logger.info(`Project deleted: ${id} by ${deletedBy}`);
        return true;
    }

    async archiveProject(id, archivedBy) {
        const project = await projectRepository.archive(id, archivedBy);
        if (!project) {
            throw new AppError('Project not found', 404);
        }

        await rabbitmqClient.logActivity({
            user: archivedBy,
            action: 'PROJECT_ARCHIVED',
            resource: 'Project',
            resourceId: id,
            details: { name: project.name },
        });

        logger.info(`Project archived: ${id} by ${archivedBy}`);
        return project;
    }

    async unarchiveProject(id, unarchivedBy) {
        const project = await projectRepository.unarchive(id);
        if (!project) {
            throw new AppError('Project not found', 404);
        }

        await rabbitmqClient.logActivity({
            user: unarchivedBy,
            action: 'PROJECT_UPDATED',
            resource: 'Project',
            resourceId: id,
            details: { action: 'unarchived' },
        });

        return project;
    }

    async addMember(projectId, userId, role, addedBy) {
        try {
            const project = await projectRepository.addMember(projectId, userId, role, addedBy);
            if (!project) {
                throw new AppError('Project not found', 404);
            }

            await rabbitmqClient.logActivity({
                user: addedBy,
                action: 'PROJECT_MEMBER_ADDED',
                resource: 'Project',
                resourceId: projectId,
                details: { userId, role },
            });

            logger.info(`Member added to project ${projectId}: ${userId} as ${role}`);
            return project;
        } catch (error) {
            if (error.message.includes('already a member')) {
                throw new AppError('User is already a member of this project', 400);
            }
            throw error;
        }
    }

    async removeMember(projectId, userId, removedBy) {
        const project = await projectRepository.removeMember(projectId, userId);
        if (!project) {
            throw new AppError('Project not found', 404);
        }

        await rabbitmqClient.logActivity({
            user: removedBy,
            action: 'PROJECT_MEMBER_REMOVED',
            resource: 'Project',
            resourceId: projectId,
            details: { userId },
        });

        logger.info(`Member removed from project ${projectId}: ${userId}`);
        return project;
    }

    async updateMemberRole(projectId, userId, newRole, updatedBy) {
        try {
            const project = await projectRepository.updateMemberRole(projectId, userId, newRole);
            if (!project) {
                throw new AppError('Project not found', 404);
            }

            await rabbitmqClient.logActivity({
                user: updatedBy,
                action: 'PROJECT_UPDATED',
                resource: 'Project',
                resourceId: projectId,
                details: { action: 'member_role_updated', userId, newRole },
            });

            return project;
        } catch (error) {
            if (error.message.includes('not a member')) {
                throw new AppError('User is not a member of this project', 400);
            }
            throw error;
        }
    }

    async searchProjects(searchTerm, userId, options = {}) {
        return await projectRepository.search(searchTerm, userId, options);
    }

    async getProjectStats(projectId) {
        return await projectRepository.getProjectStats(projectId);
    }
}

export default new ProjectService();
