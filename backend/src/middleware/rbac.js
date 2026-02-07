import { AppError } from './errorHandler.js';
import Project from '../models/Project.js';

/**
 * Check if user has required role
 */
export const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return next(new AppError('Authentication required', 401));
        }

        if (!roles.includes(req.user.role)) {
            return next(
                new AppError(
                    `Access denied. Required role: ${roles.join(' or ')}`,
                    403
                )
            );
        }

        next();
    };
};

/**
 * Check if user is Admin
 */
/**
 * Check if user is Admin or SuperAdmin
 */
export const requireAdmin = requireRole('Admin', 'SuperAdmin');

/**
 * Check if user is SuperAdmin
 */
export const requireSuperAdmin = requireRole('SuperAdmin');

/**
 * Check if user is Admin, SuperAdmin, or Manager
 */
export const requireAdminOrManager = requireRole('Admin', 'SuperAdmin', 'Manager');

/**
 * Check if user is project member
 */
export const requireProjectMember = async (req, res, next) => {
    try {
        if (!req.user) {
            return next(new AppError('Authentication required', 401));
        }

        const projectId = req.params.projectId || req.params.id || req.body.project;

        if (!projectId) {
            return next(new AppError('Project ID is required', 400));
        }

        const project = await Project.findById(projectId);

        if (!project) {
            return next(new AppError('Project not found', 404));
        }

        // SuperAdmin can access all projects
        if (req.user.role === 'SuperAdmin') {
            req.project = project;
            return next();
        }

        // Check if user is a member
        if (!project.isMember(req.user._id)) {
            return next(
                new AppError('Access denied. You are not a member of this project', 403)
            );
        }

        req.project = project;
        next();
    } catch (error) {
        next(error);
    }
};

/**
 * Check if user has project permission
 */
export const requireProjectPermission = (requiredRole) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return next(new AppError('Authentication required', 401));
            }

            const projectId = req.params.projectId || req.params.id || req.body.project;

            if (!projectId) {
                return next(new AppError('Project ID is required', 400));
            }

            const project = await Project.findById(projectId);

            if (!project) {
                return next(new AppError('Project not found', 404));
            }

            // SuperAdmin can access all projects
            if (req.user.role === 'SuperAdmin') {
                req.project = project;
                return next();
            }

            // Check project-level permission
            if (!project.hasPermission(req.user._id, requiredRole)) {
                return next(
                    new AppError(
                        `Access denied. Required project role: ${requiredRole}`,
                        403
                    )
                );
            }

            req.project = project;
            next();
        } catch (error) {
            next(error);
        }
    };
};

/**
 * Check if project is active
 */
export const requireActiveProject = (req, res, next) => {
    // Project should be attached by previous middleware (requireProjectMember or requireProjectPermission)
    if (req.project && req.project.status === 'Archived') {
        return next(
            new AppError(
                'This action cannot be performed on an archived project',
                400
            )
        );
    }
    next();
};

/**
 * Check if user owns the resource or is Admin
 */
export const requireOwnerOrAdmin = (ownerField = 'createdBy') => {
    return (req, res, next) => {
        if (!req.user) {
            return next(new AppError('Authentication required', 401));
        }

        const resource = req.resource; // Resource should be attached by previous middleware

        if (!resource) {
            return next(new AppError('Resource not found', 404));
        }

        // SuperAdmin can access everything
        if (req.user.role === 'SuperAdmin') {
            return next();
        }

        // Check ownership
        const ownerId = resource[ownerField];

        if (!ownerId || ownerId.toString() !== req.user._id.toString()) {
            return next(
                new AppError('Access denied. You do not own this resource', 403)
            );
        }

        next();
    };
};

/**
 * Check if user can manage other users
 */
export const canManageUsers = (req, res, next) => {
    if (!req.user) {
        return next(new AppError('Authentication required', 401));
    }

    // Only Admin and SuperAdmin can create/manage users
    if (!['Admin', 'SuperAdmin'].includes(req.user.role)) {
        return next(
            new AppError('Access denied. Only administrators can manage users', 403)
        );
    }

    next();
};

/**
 * Prevent self-modification for critical operations
 */
export const preventSelfModification = (req, res, next) => {
    const targetUserId = req.params.userId || req.params.id;

    if (targetUserId === req.user._id.toString()) {
        return next(
            new AppError('You cannot perform this action on yourself', 400)
        );
    }

    next();
};
