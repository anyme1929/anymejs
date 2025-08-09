'use strict';

var winston = require('winston');
var DailyRotateFile = require('winston-daily-rotate-file');

const is_dev = process.env.NODE_ENV === "development";
const level = is_dev ? "debug" : "info";
const logger = winston.createLogger({
    level,
    format: winston.format.combine(winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }), winston.format.errors({ stack: true }), winston.format.json(), winston.format.printf(({ timestamp, level, message, stack }) => {
        const l = level.toUpperCase();
        return stack
            ? `${timestamp} [${l}] ${message}\n${stack}`
            : `${timestamp} [${l}] ${message}`;
    })),
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(winston.format.colorize({ all: true })),
        }),
        new DailyRotateFile({
            filename: "logs/app-%DATE%.log",
            datePattern: "YYYY-MM-DD",
            zippedArchive: true,
            maxSize: "20m",
            maxFiles: is_dev ? "7d" : "30d",
        }),
    ],
});

module.exports = logger;
//# sourceMappingURL=logger.js.map
