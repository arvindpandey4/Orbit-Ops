import winston from 'winston';
import config from './index.js';

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Custom log format
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

// Create logger instance
// Define transports
const transports = [
    new winston.transports.Console({
        format: combine(
            colorize(),
            logFormat
        ),
    }),
];

// Only add file transports in development
if (config.nodeEnv !== 'production') {
    transports.push(
        new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        })
    );
    transports.push(
        new winston.transports.File({
            filename: 'logs/combined.log',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        })
    );
}

// Create logger instance
const logger = winston.createLogger({
    level: config.nodeEnv === 'production' ? 'info' : 'debug',
    format: combine(
        errors({ stack: true }),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        logFormat
    ),
    transports: transports,
});

// Add exception/rejection handlers only in dev to avoid EACCES
if (config.nodeEnv !== 'production') {
    logger.exceptions.handle(
        new winston.transports.File({ filename: 'logs/exceptions.log' })
    );
    logger.rejections.handle(
        new winston.transports.File({ filename: 'logs/rejections.log' })
    );
}

// Stream for Morgan HTTP logger
logger.stream = {
    write: (message) => logger.info(message.trim()),
};

export default logger;
