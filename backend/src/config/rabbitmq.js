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
    if (!config.rabbitmq.url) {
      logger.warn("RABBITMQ_URL missing — RabbitMQ disabled");
      return;
    }

    try {
      logger.info("Connecting to RabbitMQ...");

      this.connection = await amqp.connect(config.rabbitmq.url);
      this.channel = await this.connection.createChannel();
      this.isConnected = true;

      logger.info("RabbitMQ connected");

      await this.channel.assertExchange(config.rabbitmq.exchanges.taskExchange, "topic", { durable: true });
      await this.channel.assertExchange(config.rabbitmq.exchanges.userExchange, "topic", { durable: true });

      for (const q of Object.values(config.rabbitmq.queues)) {
        await this.channel.assertQueue(q, { durable: true });
      }

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

      this.connection.on("close", () => {
        logger.warn("RabbitMQ closed — reconnecting");
        this.isConnected = false;
        setTimeout(() => this.connect(), 5000);
      });

    } catch (err) {
      logger.error("RabbitMQ connect failed:", err);
      setTimeout(() => this.connect(), 5000);
    }
  }

  getChannel() {
    return this.channel;
  }

  async sendToQueue(queue, payload) {
    if (!this.isConnected || !this.channel) return false;

    this.channel.sendToQueue(queue, Buffer.from(JSON.stringify(payload)), {
      persistent: true,
    });

    return true;
  }

  async publishEvent(exchange, routingKey, payload) {
    if (!this.isConnected || !this.channel) return false;

    this.channel.publish(exchange, routingKey, Buffer.from(JSON.stringify(payload)), {
      persistent: true,
    });

    return true;
  }
}

export default new RabbitMQClient();
