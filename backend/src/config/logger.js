import winston from "winston";

const { combine, timestamp, printf, colorize, errors } = winston.format;

const isProduction = process.env.NODE_ENV === "production";

const logFormat = printf(({ level, message, timestamp, stack, ...metadata }) => {
  let msg = `${timestamp} [${level}]: ${message}`;

  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }

  if (stack) {
    msg += `\n${stack}`;
  }

  return msg;
});

const transports = [
  new winston.transports.Console({
    format: combine(colorize(), logFormat),
  }),
];

// File logging ONLY locally
if (!isProduction) {
  transports.push(
    new winston.transports.File({
      filename: "logs/error.log",
      level: "error",
      maxsize: 5242880,
      maxFiles: 5,
    })
  );

  transports.push(
    new winston.transports.File({
      filename: "logs/combined.log",
      maxsize: 5242880,
      maxFiles: 5,
    })
  );
}

const logger = winston.createLogger({
  level: isProduction ? "info" : "debug",
  format: combine(errors({ stack: true }), timestamp({ format: "YYYY-MM-DD HH:mm:ss" }), logFormat),
  transports,
});

// Dev-only exception handlers
if (!isProduction) {
  logger.exceptions.handle(new winston.transports.File({ filename: "logs/exceptions.log" }));
  logger.rejections.handle(new winston.transports.File({ filename: "logs/rejections.log" }));
}

logger.stream = {
  write: (message) => logger.info(message.trim()),
};

export default logger;
