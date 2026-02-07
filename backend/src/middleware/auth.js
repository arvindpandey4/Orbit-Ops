import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import redisClient from '../config/redis.js';
import User from '../models/User.js';
import { AppError } from './errorHandler.js';

/**
 * Verify JWT token and attach user to request
 */
export const authenticate = async (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new AppError('No token provided', 401);
        }

        const token = authHeader.split(' ')[1];

        // Check if token is blacklisted
        const isBlacklisted = await redisClient.isTokenBlacklisted(token);
        if (isBlacklisted) {
            throw new AppError('Token has been revoked', 401);
        }

        // Verify token
        const decoded = jwt.verify(token, config.jwt.secret);

        // Get user from database
        const user = await User.findById(decoded.userId);

        if (!user) {
            throw new AppError('User not found', 401);
        }

        if (!user.isActive) {
            throw new AppError('User account is deactivated', 401);
        }

        // Attach user to request
        req.user = user;
        req.token = token;

        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return next(new AppError('Invalid token', 401));
        }
        if (error.name === 'TokenExpiredError') {
            return next(new AppError('Token expired', 401));
        }
        next(error);
    }
};

/**
 * Optional authentication - doesn't fail if no token
 */
export const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next();
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, config.jwt.secret);
        const user = await User.findById(decoded.userId);

        if (user && user.isActive) {
            req.user = user;
            req.token = token;
        }

        next();
    } catch (error) {
        // Ignore errors for optional auth
        next();
    }
};

/**
 * Verify refresh token
 */
export const verifyRefreshToken = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            throw new AppError('Refresh token is required', 400);
        }

        // Verify token
        const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);

        // Get user and check if refresh token exists
        const user = await User.findById(decoded.userId);

        if (!user) {
            throw new AppError('User not found', 401);
        }

        if (!user.isActive) {
            throw new AppError('User account is deactivated', 401);
        }

        const hasToken = user.refreshTokens.some(rt => rt.token === refreshToken);

        if (!hasToken) {
            throw new AppError('Invalid refresh token', 401);
        }

        req.user = user;
        req.refreshToken = refreshToken;

        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return next(new AppError('Invalid refresh token', 401));
        }
        if (error.name === 'TokenExpiredError') {
            return next(new AppError('Refresh token expired', 401));
        }
        next(error);
    }
};

/**
 * Generate access token
 */
export const generateAccessToken = (userId) => {
    return jwt.sign({ userId }, config.jwt.secret, {
        expiresIn: config.jwt.expiresIn,
    });
};

/**
 * Generate refresh token
 */
export const generateRefreshToken = (userId) => {
    return jwt.sign({ userId }, config.jwt.refreshSecret, {
        expiresIn: config.jwt.refreshExpiresIn,
    });
};

/**
 * Generate token pair
 */
export const generateTokenPair = (userId) => {
    return {
        accessToken: generateAccessToken(userId),
        refreshToken: generateRefreshToken(userId),
    };
};
