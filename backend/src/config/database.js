import mongoose from 'mongoose';
import config from './index.js';
import logger from './logger.js';

class Database {
    constructor() {
        this.connection = null;
    }

    async connect() {
        try {
            const uri = config.nodeEnv === 'test' ? config.mongodb.testUri : config.mongodb.uri;

            this.connection = await mongoose.connect(uri, config.mongodb.options);

            logger.info(`MongoDB connected: ${this.connection.connection.host}`);

            // Handle connection events
            mongoose.connection.on('error', (err) => {
                logger.error('MongoDB connection error:', err);
            });

            mongoose.connection.on('disconnected', () => {
                logger.warn('MongoDB disconnected');
            });

            mongoose.connection.on('reconnected', () => {
                logger.info('MongoDB reconnected');
            });

            // Graceful shutdown
            process.on('SIGINT', async () => {
                await this.disconnect();
                process.exit(0);
            });

            return this.connection;
        } catch (error) {
            logger.error('MongoDB connection failed:', error);
            throw error;
        }
    }

    async disconnect() {
        try {
            await mongoose.connection.close();
            logger.info('MongoDB connection closed');
        } catch (error) {
            logger.error('Error closing MongoDB connection:', error);
            throw error;
        }
    }

    async dropDatabase() {
        if (config.nodeEnv === 'test') {
            await mongoose.connection.dropDatabase();
            logger.info('Test database dropped');
        }
    }
}

export default new Database();
