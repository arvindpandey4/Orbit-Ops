import amqp from 'amqplib';
import config from './index.js';
import logger from './logger.js';

class RabbitMQClient {
    constructor() {
        this.connection = null;
        this.channel = null;
        this.isConnected = false;
    }

    async connect() {
        try {
            this.connection = await amqp.connect(config.rabbitmq.url);
            this.channel = await this.connection.createChannel();

            logger.info('RabbitMQ connected');
            this.isConnected = true;

            // Setup exchanges
            await this.channel.assertExchange(config.rabbitmq.exchanges.taskExchange, 'topic', {
                durable: true,
            });


            await this.channel.assertExchange(config.rabbitmq.exchanges.userExchange, 'topic', {
                durable: true,
            });

            // Setup queues
            await this.channel.assertQueue(config.rabbitmq.queues.taskEvents, { durable: true });
            await this.channel.assertQueue(config.rabbitmq.queues.userEvents, { durable: true });
            await this.channel.assertQueue(config.rabbitmq.queues.activityLogs, { durable: true });
            await this.channel.assertQueue(config.rabbitmq.queues.notifications, { durable: true });

            // Bind queues to exchanges
            await this.channel.bindQueue(
                config.rabbitmq.queues.taskEvents,
                config.rabbitmq.exchanges.taskExchange,
                'task.*'
            );

            await this.channel.bindQueue(
                config.rabbitmq.queues.userEvents,
                config.rabbitmq.exchanges.userExchange,
                'user.*'
            );

            // Handle connection events
            this.connection.on('error', (err) => {
                logger.error('RabbitMQ connection error:', err);
                this.isConnected = false;
            });

            this.connection.on('close', () => {
                logger.warn('RabbitMQ connection closed');
                this.isConnected = false;
                // Attempt to reconnect after 5 seconds
                setTimeout(() => this.connect(), 5000);
            });

            return this.channel;
        } catch (error) {
            logger.error('RabbitMQ connection failed:', error);
            this.isConnected = false;
            // Attempt to reconnect after 5 seconds
            setTimeout(() => this.connect(), 5000);
            throw error;
        }
    }

    async disconnect() {
        try {
            if (this.channel) {
                await this.channel.close();
            }
            if (this.connection) {
                await this.connection.close();
            }
            logger.info('RabbitMQ connection closed');
            this.isConnected = false;
        } catch (error) {
            logger.error('Error closing RabbitMQ connection:', error);
            throw error;
        }
    }

    // Publish event to exchange
    async publishEvent(exchange, routingKey, event) {
        try {
            if (!this.isConnected || !this.channel) {
                logger.warn('RabbitMQ not connected, skipping event publish');
                return false;
            }

            const message = JSON.stringify({
                ...event,
                timestamp: new Date().toISOString(),
            });

            this.channel.publish(exchange, routingKey, Buffer.from(message), {
                persistent: true,
                contentType: 'application/json',
            });

            logger.debug(`Event published to ${exchange} with routing key ${routingKey}`);
            return true;
        } catch (error) {
            logger.error('Error publishing event:', error);
            return false;
        }
    }

    // Send message to queue
    async sendToQueue(queue, message) {
        try {
            if (!this.isConnected || !this.channel) {
                logger.warn('RabbitMQ not connected, skipping queue send');
                return false;
            }

            const msg = JSON.stringify({
                ...message,
                timestamp: new Date().toISOString(),
            });

            this.channel.sendToQueue(queue, Buffer.from(msg), {
                persistent: true,
                contentType: 'application/json',
            });

            logger.debug(`Message sent to queue ${queue}`);
            return true;
        } catch (error) {
            logger.error('Error sending to queue:', error);
            return false;
        }
    }

    // Consume messages from queue
    async consume(queue, callback) {
        try {
            if (!this.isConnected || !this.channel) {
                logger.warn('RabbitMQ not connected, cannot consume');
                return;
            }

            await this.channel.consume(queue, async (msg) => {
                if (msg) {
                    try {
                        const content = JSON.parse(msg.content.toString());
                        await callback(content);
                        this.channel.ack(msg);
                    } catch (error) {
                        logger.error('Error processing message:', error);
                        // Reject and requeue the message
                        this.channel.nack(msg, false, true);
                    }
                }
            });

            logger.info(`Consuming messages from queue: ${queue}`);
        } catch (error) {
            logger.error('Error setting up consumer:', error);
            throw error;
        }
    }

    // Task event helpers
    async publishTaskCreated(task) {
        return this.publishEvent(
            config.rabbitmq.exchanges.taskExchange,
            'task.created',
            { eventType: 'TASK_CREATED', task }
        );
    }

    async publishTaskUpdated(task, changes) {
        return this.publishEvent(
            config.rabbitmq.exchanges.taskExchange,
            'task.updated',
            { eventType: 'TASK_UPDATED', task, changes }
        );
    }

    async publishTaskDeleted(taskId) {
        return this.publishEvent(
            config.rabbitmq.exchanges.taskExchange,
            'task.deleted',
            { eventType: 'TASK_DELETED', taskId }
        );
    }

    // User event helpers
    async publishUserConnected(userId, socketId) {
        return this.publishEvent(
            config.rabbitmq.exchanges.userExchange,
            'user.connected',
            { eventType: 'USER_CONNECTED', userId, socketId }
        );
    }

    async publishUserDisconnected(userId) {
        return this.publishEvent(
            config.rabbitmq.exchanges.userExchange,
            'user.disconnected',
            { eventType: 'USER_DISCONNECTED', userId }
        );
    }

    async logActivity(activity) {
        return this.sendToQueue(config.rabbitmq.queues.activityLogs, activity);
    }

    getChannel() {
        return this.channel;
    }

    async publishToQueue(queue, message) {
        return this.sendToQueue(queue, message);
    }

    async publishEmail(emailData) {
        return this.sendToQueue('email_queue', emailData);
    }
}

export default new RabbitMQClient();
