import rateLimit from 'express-rate-limit';
import redisClient from '../config/redis.js';
import config from '../config/index.js';
import { AppError } from './errorHandler.js';

/**
 * Redis store for rate limiting
 */
class RedisStore {
    constructor(options = {}) {
        this.prefix = options.prefix || 'rl:';
        this.resetExpiryOnChange = options.resetExpiryOnChange || false;
    }

    async increment(key) {
        if (!redisClient.client || !redisClient.isConnected) {
            // Fallback: return default values when Redis unavailable
            return {
                totalHits: 1,
                resetTime: new Date(Date.now() + config.rateLimit.windowMs),
            };
        }

        try {
            const redisKey = this.prefix + key;
            const current = await redisClient.client.incr(redisKey);

            if (current === 1) {
                await redisClient.client.expire(
                    redisKey,
                    Math.ceil(config.rateLimit.windowMs / 1000)
                );
            }

            const ttl = await redisClient.client.ttl(redisKey);

            return {
                totalHits: current,
                resetTime: new Date(Date.now() + ttl * 1000),
            };
        } catch (error) {
            // Fallback on error
            return {
                totalHits: 1,
                resetTime: new Date(Date.now() + config.rateLimit.windowMs),
            };
        }
    }

    async decrement(key) {
        if (!redisClient.client || !redisClient.isConnected) return;
        try {
            const redisKey = this.prefix + key;
            await redisClient.client.decr(redisKey);
        } catch (error) {
            // Silently fail
        }
    }

    async resetKey(key) {
        if (!redisClient.client || !redisClient.isConnected) return;
        try {
            const redisKey = this.prefix + key;
            await redisClient.client.del(redisKey);
        } catch (error) {
            // Silently fail
        }
    }
}

/**
 * General API rate limiter
 */
export const apiLimiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.maxRequests,
    message: 'Too many requests from this IP, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    store: redisClient.isConnected ? new RedisStore() : undefined,
    handler: (req, res, next) => {
        next(new AppError('Too many requests, please try again later', 429));
    },
});

/**
 * Strict rate limiter for authentication endpoints
 */
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 requests per window
    message: 'Too many authentication attempts, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    store: redisClient.isConnected ? new RedisStore({ prefix: 'auth:' }) : undefined,
    handler: (req, res, next) => {
        next(new AppError('Too many authentication attempts, please try again after 15 minutes', 429));
    },
});

/**
 * Rate limiter for task creation
 */
export const taskCreationLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 tasks per minute
    message: 'Too many tasks created, please slow down',
    standardHeaders: true,
    legacyHeaders: false,
    store: redisClient.isConnected ? new RedisStore({ prefix: 'task:' }) : undefined,
    keyGenerator: (req) => {
        return req.user?._id.toString() || req.ip;
    },
    handler: (req, res, next) => {
        next(new AppError('You are creating tasks too quickly, please wait a moment', 429));
    },
});

/**
 * Rate limiter for project creation
 */
export const projectCreationLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // 5 projects per hour
    message: 'Too many projects created, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    store: redisClient.isConnected ? new RedisStore({ prefix: 'project:' }) : undefined,
    keyGenerator: (req) => {
        return req.user?._id.toString() || req.ip;
    },
    handler: (req, res, next) => {
        next(new AppError('You are creating projects too quickly, please wait', 429));
    },
});
