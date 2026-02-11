import amqp from "amqplib";
import config from "./index.js";
import logger from "./logger.js";

class RabbitMQClient {
  constructor() {
    this.connection = null;
    this.channel = null;
    this.isConnected = false;
  }

  async connect() {
    let url = config.rabbitmq.url;

    // Development fallback: default to localhost if URL missing
    if (!url && config.nodeEnv === "development") {
      logger.info("RABBITMQ_URL missing in development — defaulting to amqp://localhost:5672");
      url = "amqp://localhost:5672";
    }

    // Production: If no URL, disable RabbitMQ gracefully
    if (!url) {
      logger.warn("RABBITMQ_URL missing — RabbitMQ functionality disabled");
      this.isConnected = false;
      return;
    }

    try {
      logger.info("Connecting to RabbitMQ...");
      this.connection = await amqp.connect(url);
      this.channel = await this.connection.createChannel();
      this.isConnected = true;

      logger.info("RabbitMQ connected successfully");

      // Setup Exchanges
      await this.channel.assertExchange(config.rabbitmq.exchanges.taskExchange, "topic", { durable: true });
      await this.channel.assertExchange(config.rabbitmq.exchanges.userExchange, "topic", { durable: true });

      // Setup Queues
      for (const q of Object.values(config.rabbitmq.queues)) {
        await this.channel.assertQueue(q, { durable: true });
      }

      // Ensure email_queue exists
      await this.channel.assertQueue('email_queue', { durable: true });

      // Bind Queues
      await this.channel.bindQueue(
        config.rabbitmq.queues.taskEvents,
        config.rabbitmq.exchanges.taskExchange,
        "task.*"
      );

      await this.channel.bindQueue(
        config.rabbitmq.queues.userEvents,
        config.rabbitmq.exchanges.userExchange,
        "user.*"
      );

      // Handle connection events
      this.connection.on("close", () => {
        logger.warn("RabbitMQ connection closed");
        this.isConnected = false;
        this.channel = null;
        this.connection = null;
      });

      this.connection.on("error", (err) => {
        logger.error("RabbitMQ connection error:", err.message);
        this.isConnected = false;
      });

    } catch (err) {
      logger.error("RabbitMQ initialization failed — continuing without RabbitMQ:", err.message);
      this.isConnected = false;
      this.channel = null;
      this.connection = null;
    }
  }

  getChannel() {
    return this.channel;
  }

  async sendToQueue(queue, payload) {
    if (!this.isConnected || !this.channel) {
      logger.debug(`Skipping sendToQueue(${queue}) — RabbitMQ not connected`);
      return false;
    }

    try {
      this.channel.sendToQueue(queue, Buffer.from(JSON.stringify(payload)), {
        persistent: true,
      });
      return true;
    } catch (error) {
      logger.error(`Failed to send to queue ${queue}:`, error.message);
      return false;
    }
  }

  async publishEvent(exchange, routingKey, payload) {
    if (!this.isConnected || !this.channel) {
      logger.debug(`Skipping publishEvent(${exchange}, ${routingKey}) — RabbitMQ not connected`);
      return false;
    }

    try {
      this.channel.publish(exchange, routingKey, Buffer.from(JSON.stringify(payload)), {
        persistent: true,
      });
      return true;
    } catch (error) {
      logger.error(`Failed to publish event to ${exchange}:`, error.message);
      return false;
    }
  }

  async consume(queue, callback) {
    if (!this.isConnected || !this.channel) {
      logger.warn(`Skipping consumer for ${queue} — RabbitMQ not connected`);
      return;
    }

    try {
      await this.channel.assertQueue(queue, { durable: true });

      this.channel.consume(queue, async (msg) => {
        if (msg) {
          try {
            const content = JSON.parse(msg.content.toString());
            await callback(content);
            this.channel.ack(msg);
          } catch (error) {
            logger.error(`Error processing message from ${queue}:`, error.message);
            this.channel.nack(msg, false, false);
          }
        }
      });
    } catch (error) {
      logger.error(`Failed to setup consumer for ${queue}:`, error.message);
    }
  }

  // Alias for backward compatibility
  async publishToQueue(queue, payload) {
    return await this.sendToQueue(queue, payload);
  }

  // Helper method for activity logging
  async logActivity(activity) {
    if (!this.isConnected || !this.channel) {
      logger.debug('Skipping activity log — RabbitMQ not connected');
      return false;
    }
    return await this.sendToQueue(config.rabbitmq.queues.activityLogs, activity);
  }

  // Task Events
  async publishTaskCreated(task) {
    if (!this.isConnected || !this.channel) return false;
    return this.publishEvent(config.rabbitmq.exchanges.taskExchange, 'task.created', task);
  }

  async publishTaskUpdated(task, changes) {
    if (!this.isConnected || !this.channel) return false;
    return this.publishEvent(config.rabbitmq.exchanges.taskExchange, 'task.updated', { task, changes });
  }

  async publishTaskDeleted(taskId) {
    if (!this.isConnected || !this.channel) return false;
    return this.publishEvent(config.rabbitmq.exchanges.taskExchange, 'task.deleted', { taskId });
  }

  // User Events
  async publishUserConnected(userId, socketId) {
    if (!this.isConnected || !this.channel) return false;
    return this.publishEvent(config.rabbitmq.exchanges.userExchange, 'user.connected', { userId, socketId });
  }

  async publishUserDisconnected(userId) {
    if (!this.isConnected || !this.channel) return false;
    return this.publishEvent(config.rabbitmq.exchanges.userExchange, 'user.disconnected', { userId });
  }

  // Email Event
  async publishEmail(payload) {
    if (!this.isConnected || !this.channel) return false;
    return this.sendToQueue('email_queue', payload);
  }
}

export default new RabbitMQClient();
