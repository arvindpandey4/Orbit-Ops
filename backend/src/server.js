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


// Start server
const startServer = async () => {
    try {
        // Connect to MongoDB
        await database.connect();

        // Seed Super Admin
        await userService.seedSuperAdmin();

        // Connect to Redis
        await redisClient.connect();

        // Connect to RabbitMQ
        await rabbitmqClient.connect();

        // Start activity log worker
        await activityLogWorker.start();

        // Start email worker
        await emailWorker.start();

        // Start HTTP server
        server.listen(config.port, () => {
            logger.info(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   Task Management System - Backend Server                ║
║                                                           ║
║   Environment: ${config.nodeEnv.padEnd(43)}║
║   Port:        ${config.port.toString().padEnd(43)}║
║   MongoDB:     Connected                                  ║
║   Redis:       Connected                                  ║
║   RabbitMQ:    Connected                                  ║
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
        process.exit(1);
    }
};

startServer();
