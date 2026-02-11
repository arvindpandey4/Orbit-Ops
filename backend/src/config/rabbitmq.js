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
      logger.warn("RABBITMQ_URL not set — skipping RabbitMQ");
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
        logger.warn("RabbitMQ closed — reconnecting in 5s");
        this.isConnected = false;
        setTimeout(() => this.connect(), 5000);
      });

      this.connection.on("error", (err) => {
        logger.error("RabbitMQ error:", err);
        this.isConnected = false;
      });

    } catch (err) {
      logger.error("RabbitMQ connect failed:", err);
      setTimeout(() => this.connect(), 5000);
    }
  }

  async publishEvent(exchange, routingKey, event) {
    if (!this.isConnected || !this.channel) return false;

    this.channel.publish(exchange, routingKey, Buffer.from(JSON.stringify(event)), {
      persistent: true,
      contentType: "application/json",
    });

    return true;
  }

  async sendToQueue(queue, message) {
    if (!this.isConnected || !this.channel) return false;

    this.channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), {
      persistent: true,
      contentType: "application/json",
    });

    return true;
  }
}

export default new RabbitMQClient();
