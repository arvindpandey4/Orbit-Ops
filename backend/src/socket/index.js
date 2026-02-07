import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import redisClient from '../config/redis.js';
import rabbitmqClient from '../config/rabbitmq.js';
import logger from '../config/logger.js';
import User from '../models/User.js';

export const initializeSocket = (httpServer) => {
    const io = new Server(httpServer, {
        cors: {
            origin: config.cors.origin,
            credentials: true,
        },
        pingTimeout: config.socket.pingTimeout,
        pingInterval: config.socket.pingInterval,
    });

    // Authentication middleware
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

            if (!token) {
                return next(new Error('Authentication required'));
            }

            const decoded = jwt.verify(token, config.jwt.secret);
            const user = await User.findById(decoded.userId);

            if (!user || !user.isActive) {
                return next(new Error('Invalid user'));
            }

            socket.userId = user._id.toString();
            socket.user = user;
            next();
        } catch (error) {
            next(new Error('Authentication failed'));
        }
    });

    io.on('connection', async (socket) => {
        logger.info(`Socket connected: ${socket.id} (User: ${socket.userId})`);

        // Set user online in Redis
        await redisClient.setUserOnline(socket.userId, socket.id);

        // Publish user connected event
        await rabbitmqClient.publishUserConnected(socket.userId, socket.id);

        // Broadcast user online status to all clients
        socket.broadcast.emit('user:online', { userId: socket.userId });

        // Join user's personal room
        socket.join(`user:${socket.userId}`);

        // Handle join project room
        socket.on('join-project', async ({ projectId }) => {
            socket.join(`project:${projectId}`);
            logger.debug(`User ${socket.userId} joined project ${projectId}`);
        });

        // Handle leave project room
        socket.on('leave-project', ({ projectId }) => {
            socket.leave(`project:${projectId}`);
            logger.debug(`User ${socket.userId} left project ${projectId}`);
        });

        // Handle typing indicator
        socket.on('typing:start', ({ projectId, taskId }) => {
            socket.to(`project:${projectId}`).emit('user:typing', {
                userId: socket.userId,
                taskId,
                userName: socket.user.name,
            });
        });

        socket.on('typing:stop', ({ projectId, taskId }) => {
            socket.to(`project:${projectId}`).emit('user:stopped-typing', {
                userId: socket.userId,
                taskId,
            });
        });

        // Handle disconnect
        socket.on('disconnect', async () => {
            logger.info(`Socket disconnected: ${socket.id} (User: ${socket.userId})`);

            // Set user offline in Redis
            await redisClient.setUserOffline(socket.userId);

            // Publish user disconnected event
            await rabbitmqClient.publishUserDisconnected(socket.userId);

            // Broadcast user offline status
            socket.broadcast.emit('user:offline', { userId: socket.userId });
        });

        // Handle errors
        socket.on('error', (error) => {
            logger.error(`Socket error for ${socket.userId}:`, error);
        });
    });

    logger.info('Socket.IO initialized');
    return io;
};

export default initializeSocket;
