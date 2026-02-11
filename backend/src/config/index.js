import dotenv from "dotenv";
dotenv.config();

const isProduction = process.env.NODE_ENV === "production";

export default {
  // Server
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || "development",
  frontendUrl: process.env.FRONTEND_URL,

  // Mongo
  mongodb: {
    uri: process.env.MONGODB_URI,
    testUri: process.env.MONGODB_TEST_URI,
    options: {
      maxPoolSize: 10,
      minPoolSize: 2,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 5000,
    },
  },

  // Redis (Railway URL ONLY)
  redis: {
    url: process.env.REDIS_URL,
    retryStrategy: (times) => Math.min(times * 50, 2000),
  },

  // RabbitMQ (Railway URL ONLY)
  rabbitmq: {
    url: process.env.RABBITMQ_URL,
    queues: {
      taskEvents: "task_events",
      userEvents: "user_events",
      activityLogs: "activity_logs",
      notifications: "notifications",
    },
    exchanges: {
      taskExchange: "task_exchange",
      userExchange: "user_exchange",
    },
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || "15m",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
    cookieOptions: {
      httpOnly: true,
      secure: isProduction,
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  },

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackUrl: process.env.GOOGLE_CALLBACK_URL,
  },

  email: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    from: process.env.EMAIL_FROM,
  },

  rateLimit: {
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    maxRequests: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  },

  cors: {
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  },

  admin: {
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
  },

  pagination: {
    defaultLimit: 20,
    maxLimit: 100,
  },

  socket: {
    pingTimeout: 60000,
    pingInterval: 25000,
  },

  session: {
    presenceTTL: 300,
    tokenBlacklistTTL: 900,
  },
};
