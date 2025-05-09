import winston from "winston";

/**
 * Winston logger instance for application-wide logging.
 * @type {import('winston').Logger}
 */
if (typeof globalThis.setImmediate === "undefined") {
  (globalThis as any).setImmediate = (fn: (...args: any[]) => void, ...args: any[]) => setTimeout(fn, 0, ...args);
}

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      const metaString = Object.keys(meta).length ? JSON.stringify(meta) : "";
      return `[${timestamp}] [${level.toUpperCase()}]: ${message} ${metaString}`;
    }),
  ),
  transports: [new winston.transports.Console()],
});

export default logger;
