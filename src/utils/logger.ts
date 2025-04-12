/**
 * Centralized logging utility for application-wide logging.
 * Implements Winston logger with custom formatter.
 * @module logger
 */

import winston from 'winston';

/**
 * Configured Winston logger instance.
 * Provides standardized logging across the application with timestamp
 * and formatted output. Currently outputs to console only.
 * 
 * @type {winston.Logger}
 */
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
            // Format log entries with timestamp, level, message and any additional metadata
            const metaString = Object.keys(meta).length ? JSON.stringify(meta) : '';
            return `[${timestamp}] [${level.toUpperCase()}]: ${message} ${metaString}`;
        })
    ),
    transports: [new winston.transports.Console()],
});

export default logger;