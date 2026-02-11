import http from 'http';
import app from './app.js';
import config from './config/index.js';
import logger from './config/logger.js';
import database from './config/database.js';
import redisClient from './config/redis.js';
import rabbitmqClient from './config/rabbitmq.js';
import initializeSocket from './socket/index.js';
import activityLogWorker from './workers/activityLogWorker.js';
import emailWorker from './workers/emailWorker.js';
import userService from './services/userService.js';

const server = http.createServer(app);

// Initialize Socket.IO
const io = initializeSocket(server);

// Make io available to the app
app.set('io', io);

console.log("BUILD VERSION CHECK");

// Start server
const startServer = async () => {
    try {
        // Connect to MongoDB
        await database.connect();

        // Seed Super Admin
        await userService.seedSuperAdmin();

        // Connect to Redis (non-blocking)
        try {
            await redisClient.connect();
        } catch (error) {
            logger.warn('Redis connection failed - continuing without Redis:', error.message);
        }

        // Connect to RabbitMQ (non-blocking)
        await rabbitmqClient.connect();

        // Start workers (non-blocking - failures won't crash server)
        try {
            await activityLogWorker.start();
        } catch (error) {
            logger.warn('Activity log worker failed to start:', error.message);
        }

        try {
            await emailWorker.start();
        } catch (error) {
            logger.warn('Email worker failed to start:', error.message);
        }

        // Handle server errors
        server.on('error', (error) => {
            if (error.code === 'EADDRINUSE') {
                logger.error(`Port ${config.port} is already in use`);
            } else {
                logger.error('Server error:', error);
            }
            process.exit(1);
        });

        // Start HTTP server
        server.listen(config.port, () => {
            const rabbitMQStatus = rabbitmqClient.isConnected ? "Connected" : "Disabled/Failed";
            const redisStatus = redisClient.isConnected ? "Connected" : "Disabled/Failed";
            logger.info(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   Task Management System - Backend Server                ║
║                                                           ║
║   Environment: ${config.nodeEnv.padEnd(43)}║
║   Port:        ${config.port.toString().padEnd(43)}║
║   MongoDB:     Connected                                  ║
║   Redis:       ${redisStatus.padEnd(43)}║
║   RabbitMQ:    ${rabbitMQStatus.padEnd(43)}║
║   Socket.IO:   Initialized                                ║
║   OAuth ID:    ${config.google.clientId.substring(0, 15)}...              ║
║                                                           ║
║   API:         http://localhost:${config.port.toString().padEnd(28)}║
║   Health:      http://localhost:${config.port}/api/health${' '.repeat(13)}║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
      `);
        });
    } catch (error) {
        logger.error('Failed to start server:', error);
        console.error('STARTUP ERROR:', error); // Also log to console for visibility
        process.exit(1);
    }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    console.error('UNHANDLED REJECTION:', reason);
    process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    console.error('UNCAUGHT EXCEPTION:', error);
    process.exit(1);
});

startServer();

