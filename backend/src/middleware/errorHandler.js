import logger from '../config/logger.js';

/**
 * Custom Application Error class
 */
export class AppError extends Error {
    constructor(message, statusCode = 500, details = null) {
        super(message);
        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.isOperational = true;
        this.details = details;

        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Handle Mongoose Cast Error
 */
const handleCastError = (err) => {
    const message = `Invalid ${err.path}: ${err.value}`;
    return new AppError(message, 400);
};

/**
 * Handle Mongoose Duplicate Key Error
 */
const handleDuplicateKeyError = (err) => {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    const message = `Duplicate value for ${field}: ${value}. Please use another value.`;
    return new AppError(message, 400);
};

/**
 * Handle Mongoose Validation Error
 */
const handleValidationError = (err) => {
    const errors = Object.values(err.errors).map(el => ({
        field: el.path,
        message: el.message,
    }));
    return new AppError('Validation failed', 400, errors);
};

/**
 * Send error response in development
 */
const sendErrorDev = (err, res) => {
    res.status(err.statusCode).json({
        status: err.status,
        error: err,
        message: err.message,
        details: err.details,
        stack: err.stack,
    });
};

/**
 * Send error response in production
 */
const sendErrorProd = (err, res) => {
    // Operational, trusted error: send message to client
    if (err.isOperational) {
        res.status(err.statusCode).json({
            status: err.status,
            message: err.message,
            details: err.details,
        });
    } else {
        // Programming or unknown error: don't leak error details
        logger.error('ERROR 💥', err);

        res.status(500).json({
            status: 'error',
            message: 'Something went wrong',
        });
    }
};

/**
 * Global error handling middleware
 */
export const errorHandler = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    // Log error
    if (err.statusCode >= 500) {
        logger.error({
            message: err.message,
            stack: err.stack,
            url: req.originalUrl,
            method: req.method,
            ip: req.ip,
            user: req.user?._id,
        });
    } else {
        logger.warn({
            message: err.message,
            url: req.originalUrl,
            method: req.method,
            statusCode: err.statusCode,
        });
    }

    if (process.env.NODE_ENV === 'development') {
        sendErrorDev(err, res);
    } else {
        let error = { ...err };
        error.message = err.message;
        error.name = err.name;

        // Handle specific error types
        if (err.name === 'CastError') error = handleCastError(err);
        if (err.code === 11000) error = handleDuplicateKeyError(err);
        if (err.name === 'ValidationError') error = handleValidationError(err);

        sendErrorProd(error, res);
    }
};

/**
 * Handle 404 errors
 */
export const notFound = (req, res, next) => {
    const err = new AppError(
        `Cannot ${req.method} ${req.originalUrl}`,
        404
    );
    next(err);
};

/**
 * Async error wrapper
 */
export const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
