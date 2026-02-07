import { validationResult } from 'express-validator';
import { AppError } from './errorHandler.js';

/**
 * Validate request using express-validator
 */
export const validate = (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(err => ({
            field: err.path || err.param,
            message: err.msg,
            value: err.value,
        }));

        return next(
            new AppError('Validation failed', 400, errorMessages)
        );
    }

    next();
};

/**
 * Sanitize request body
 */
export const sanitize = (allowedFields) => {
    return (req, res, next) => {
        if (!allowedFields || allowedFields.length === 0) {
            return next();
        }

        const sanitized = {};

        for (const field of allowedFields) {
            if (req.body.hasOwnProperty(field)) {
                sanitized[field] = req.body[field];
            }
        }

        req.body = sanitized;
        next();
    };
};

/**
 * Validate MongoDB ObjectId
 */
export const isValidObjectId = (paramName = 'id') => {
    return (req, res, next) => {
        const id = req.params[paramName];

        if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
            return next(new AppError(`Invalid ${paramName}`, 400));
        }

        next();
    };
};

/**
 * Validate pagination parameters
 */
export const validatePagination = (req, res, next) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    if (page < 1) {
        return next(new AppError('Page must be greater than 0', 400));
    }

    if (limit < 1 || limit > 100) {
        return next(new AppError('Limit must be between 1 and 100', 400));
    }

    req.pagination = {
        page,
        limit,
        skip: (page - 1) * limit,
    };

    next();
};

/**
 * Validate sort parameters
 */
export const validateSort = (allowedFields = []) => {
    return (req, res, next) => {
        const sortBy = req.query.sortBy;
        const sortOrder = req.query.sortOrder || 'desc';

        if (!sortBy) {
            req.sort = { createdAt: -1 }; // Default sort
            return next();
        }

        if (allowedFields.length > 0 && !allowedFields.includes(sortBy)) {
            return next(
                new AppError(
                    `Invalid sort field. Allowed: ${allowedFields.join(', ')}`,
                    400
                )
            );
        }

        if (!['asc', 'desc'].includes(sortOrder)) {
            return next(new AppError('Sort order must be asc or desc', 400));
        }

        req.sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
        next();
    };
};

/**
 * Validate filter parameters
 */
export const validateFilters = (allowedFilters = []) => {
    return (req, res, next) => {
        const filters = {};

        for (const filter of allowedFilters) {
            if (req.query[filter]) {
                filters[filter] = req.query[filter];
            }
        }

        req.filters = filters;
        next();
    };
};
