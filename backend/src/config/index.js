import dotenv from "dotenv";
dotenv.config();

const isProduction = process.env.NODE_ENV === "production";

export default {
  // Server Configuration
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || "development",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",

  // MongoDB Configuration
  mongodb: {
    uri: process.env.MONGODB_URI || "mongodb://localhost:27017/task_management",
    testUri:
      process.env.MONGODB_TEST_URI ||
      "mongodb://localhost:27017/task_management_test",
    options: {
      maxPoolSize: 10,
      minPoolSize: 2,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 5000,
    },
  },

  // Redis Configuration (Railway-safe)
  redis: {
    host: process.env.REDIS_HOST || (isProduction ? undefined : "localhost"),
    port: process.env.REDIS_PORT
      ? Number(process.env.REDIS_PORT)
      : isProduction
      ? undefined
      : 6379,
    password: process.env.REDIS_PASSWORD,
    db: 0,
    retryStrategy: (times) => Math.min(times * 50, 2000),
  },

  // RabbitMQ Configuration
  rabbitmq: {
    url: process.env.RABBITMQ_URL || "amqp://localhost:5672",
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

  // JWT Configuration
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

  // OAuth2 Google Configuration
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackUrl:
      process.env.GOOGLE_CALLBACK_URL ||
      "http://localhost:5000/api/auth/google/callback",
  },

  // Email Configuration
  email: {
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    from: process.env.EMAIL_FROM || "OrbitOps <noreply@orbitops.com>",
  },

  // Rate Limiting Configuration
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  },

  // CORS Configuration
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    credentials: true,
  },

  // Admin Configuration
  admin: {
    email: process.env.ADMIN_EMAIL || "admin@taskmanagement.com",
    password: process.env.ADMIN_PASSWORD,
  },

  // Pagination
  pagination: {
    defaultLimit: 20,
    maxLimit: 100,
  },

  // Socket.IO Configuration
  socket: {
    pingTimeout: 60000,
    pingInterval: 25000,
  },

  // Session Configuration
  session: {
    presenceTTL: 300,
    tokenBlacklistTTL: 900,
  },
};
