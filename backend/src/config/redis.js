import { createClient } from "redis";
import config from "./index.js";
import logger from "./logger.js";

class RedisClient {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      this.client = createClient({
        url: process.env.REDIS_URL,
        socket: {
          reconnectStrategy: config.redis.retryStrategy,
        },
      });

      // Event handlers
      this.client.on("error", (err) => {
        logger.error("Redis Client Error:", err);
        this.isConnected = false;
      });

      this.client.on("connect", () => {
        logger.info("Redis client connecting...");
      });

      this.client.on("ready", () => {
        logger.info("Redis client ready");
        this.isConnected = true;
      });

      this.client.on("reconnecting", () => {
        logger.warn("Redis client reconnecting...");
        this.isConnected = false;
      });

      this.client.on("end", () => {
        logger.warn("Redis client connection closed");
        this.isConnected = false;
      });

      await this.client.connect();
      return this.client;
    } catch (error) {
      logger.error("Redis connection failed:", error);
      throw error;
    }
  }

  async disconnect() {
    try {
      if (this.client) {
        await this.client.quit();
        logger.info("Redis connection closed");
      }
    } catch (error) {
      logger.error("Error closing Redis connection:", error);
      throw error;
    }
  }

  // User presence methods
  async setUserOnline(userId, socketId) {
    try {
      const key = `presence:${userId}`;
      await this.client.hSet(key, {
        socketId,
        status: "online",
        lastSeen: Date.now().toString(),
      });
      await this.client.expire(key, config.session.presenceTTL);
      return true;
    } catch (error) {
      logger.error("Error setting user online:", error);
      return false;
    }
  }

  async setUserOffline(userId) {
    try {
      const key = `presence:${userId}`;
      await this.client.hSet(key, {
        status: "offline",
        lastSeen: Date.now().toString(),
      });
      await this.client.expire(key, config.session.presenceTTL);
      return true;
    } catch (error) {
      logger.error("Error setting user offline:", error);
      return false;
    }
  }

  async getUserPresence(userId) {
    try {
      const key = `presence:${userId}`;
      const presence = await this.client.hGetAll(key);
      return presence.status ? presence : { status: "offline" };
    } catch (error) {
      logger.error("Error getting user presence:", error);
      return { status: "offline" };
    }
  }

  async getOnlineUsers(userIds) {
    try {
      const pipeline = this.client.multi();
      userIds.forEach((userId) => {
        pipeline.hGetAll(`presence:${userId}`);
      });

      const results = await pipeline.exec();

      return userIds.reduce((acc, userId, index) => {
        const presence = results[index];
        acc[userId] = presence?.status === "online" ? "online" : "offline";
        return acc;
      }, {});
    } catch (error) {
      logger.error("Error getting online users:", error);
      return {};
    }
  }

  // Token blacklist methods
  async blacklistToken(token, expiresIn) {
    try {
      const key = `blacklist:${token}`;
      await this.client.set(key, "1", {
        EX: expiresIn || config.session.tokenBlacklistTTL,
      });
      return true;
    } catch (error) {
      logger.error("Error blacklisting token:", error);
      return false;
    }
  }

  async isTokenBlacklisted(token) {
    try {
      const key = `blacklist:${token}`;
      const result = await this.client.get(key);
      return result !== null;
    } catch (error) {
      logger.error("Error checking token blacklist:", error);
      return false;
    }
  }

  // Cache methods
  async get(key) {
    try {
      return await this.client.get(key);
    } catch (error) {
      logger.error(`Error getting key ${key}:`, error);
      return null;
    }
  }

  async set(key, value, expiresIn) {
    try {
      if (expiresIn) {
        await this.client.set(key, value, { EX: expiresIn });
      } else {
        await this.client.set(key, value);
      }
      return true;
    } catch (error) {
      logger.error(`Error setting key ${key}:`, error);
      return false;
    }
  }

  async del(key) {
    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      logger.error(`Error deleting key ${key}:`, error);
      return false;
    }
  }

  async keys(pattern) {
    try {
      return await this.client.keys(pattern);
    } catch (error) {
      logger.error(`Error getting keys for pattern ${pattern}:`, error);
      return [];
    }
  }

  async flushAll() {
    try {
      if (config.nodeEnv === "test") {
        await this.client.flushAll();
        logger.info("Redis cache flushed");
      }
    } catch (error) {
      logger.error("Error flushing Redis:", error);
    }
  }
}

export default new RedisClient();
