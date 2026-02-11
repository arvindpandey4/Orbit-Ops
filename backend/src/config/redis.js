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
      let url = process.env.REDIS_URL;

      // Development fallback
      if (!url && config.nodeEnv === "development") {
        logger.info("REDIS_URL missing in development — defaulting to redis://localhost:6380");
        url = "redis://localhost:6380";
      }

      // Production: If no URL, disable Redis gracefully
      if (!url) {
        logger.warn("REDIS_URL missing — Redis functionality disabled");
        this.isConnected = false;
        return null;
      }

      logger.info("Connecting to Redis...");

      this.client = createClient({
        url: url,
        socket: {
          reconnectStrategy: config.redis.retryStrategy,
        },
      });

      // Event handlers
      this.client.on("error", (err) => {
        logger.error("Redis Client Error:", err.message);
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
      logger.info("Redis connected successfully");
      return this.client;
    } catch (error) {
      logger.error("Redis connection failed — continuing without Redis:", error.message);
      this.isConnected = false;
      this.client = null;
      return null;
    }
  }

  async disconnect() {
    try {
      if (this.client) {
        await this.client.quit();
        logger.info("Redis connection closed");
      }
    } catch (error) {
      logger.error("Error closing Redis connection:", error.message);
    }
  }

  // User presence methods
  async setUserOnline(userId, socketId) {
    if (!this.client || !this.isConnected) return false;
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
      logger.error("Error setting user online:", error.message);
      return false;
    }
  }

  async setUserOffline(userId) {
    if (!this.client || !this.isConnected) return false;
    try {
      const key = `presence:${userId}`;
      await this.client.hSet(key, {
        status: "offline",
        lastSeen: Date.now().toString(),
      });
      await this.client.expire(key, config.session.presenceTTL);
      return true;
    } catch (error) {
      logger.error("Error setting user offline:", error.message);
      return false;
    }
  }

  async getUserPresence(userId) {
    if (!this.client || !this.isConnected) return { status: "offline" };
    try {
      const key = `presence:${userId}`;
      const presence = await this.client.hGetAll(key);
      return presence.status ? presence : { status: "offline" };
    } catch (error) {
      logger.error("Error getting user presence:", error.message);
      return { status: "offline" };
    }
  }

  async getOnlineUsers(userIds) {
    if (!this.client || !this.isConnected) return {};
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
      logger.error("Error getting online users:", error.message);
      return {};
    }
  }

  // Token blacklist methods
  async blacklistToken(token, expiresIn) {
    if (!this.client || !this.isConnected) return false;
    try {
      const key = `blacklist:${token}`;
      await this.client.set(key, "1", {
        EX: expiresIn || config.session.tokenBlacklistTTL,
      });
      return true;
    } catch (error) {
      logger.error("Error blacklisting token:", error.message);
      return false;
    }
  }

  async isTokenBlacklisted(token) {
    if (!this.client || !this.isConnected) return false;
    try {
      const key = `blacklist:${token}`;
      const result = await this.client.get(key);
      return result !== null;
    } catch (error) {
      logger.error("Error checking token blacklist:", error.message);
      return false;
    }
  }

  // Cache methods
  async get(key) {
    if (!this.client || !this.isConnected) return null;
    try {
      return await this.client.get(key);
    } catch (error) {
      logger.error(`Error getting key ${key}:`, error.message);
      return null;
    }
  }

  async set(key, value, expiresIn) {
    if (!this.client || !this.isConnected) return false;
    try {
      if (expiresIn) {
        await this.client.set(key, value, { EX: expiresIn });
      } else {
        await this.client.set(key, value);
      }
      return true;
    } catch (error) {
      logger.error(`Error setting key ${key}:`, error.message);
      return false;
    }
  }

  async del(key) {
    if (!this.client || !this.isConnected) return false;
    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      logger.error(`Error deleting key ${key}:`, error.message);
      return false;
    }
  }

  async keys(pattern) {
    if (!this.client || !this.isConnected) return [];
    try {
      return await this.client.keys(pattern);
    } catch (error) {
      logger.error(`Error getting keys for pattern ${pattern}:`, error.message);
      return [];
    }
  }

  async flushAll() {
    if (!this.client || !this.isConnected) return;
    try {
      if (config.nodeEnv === "test") {
        await this.client.flushAll();
        logger.info("Redis cache flushed");
      }
    } catch (error) {
      logger.error("Error flushing Redis:", error.message);
    }
  }
}

export default new RedisClient();
