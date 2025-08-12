import { resolve } from "node:path";
import { format } from "winston";
import { IConfig } from "../types";
export default {
  public_path: "public",
  port: parseInt(process.env.PORT || "3000"),
  api_prefix: process.env.API_PREFIX || "",
  logger: {
    level: "info",
    format: format.combine(
      format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
      format.errors({ stack: true }),
      format.printf(({ timestamp, level, message, stack }) => {
        level = level.toUpperCase();
        const printf = `${timestamp} [${level}] ${message}`;
        return stack ? `${printf}\n${stack}` : printf;
      })
    ),
    transports: {
      console: {
        format: format.colorize({ all: true }),
      },
      file: {
        filename: "logs/app-%DATE%.log", // 文件名模式（含日期占位符）
        datePattern: "YYYY-MM-DD", // 日期格式（每天一个文件）
        zippedArchive: true, // 启用旧日志压缩归档
        maxSize: "20m", // 单个文件最大尺寸（20MB）
        maxFiles: process.env.NODE_ENV === "development" ? "7d" : "30d", // 保留周期（开发环境7天，生产环境30天）
        // frequency: "24h",             // 滚动频率（默认与datePattern匹配）
        // dirname: "logs",              // 日志目录（默认从filename解析）
        // auditFile: "logs/audit.json", // 审计文件路径
        // utc: true,                    // 使用UTC时间（默认false）
        // extension: ".log",           // 文件扩展名
        // symlinkName: "app-current.log",// 当前日志符号链接名称
        // format: winston.format.json(),// 格式（已在父级logger统一配置）
        // level: "info",                // 日志级别过滤（已在父级logger配置）
        // silent: false,                // 禁用所有日志（调试用）
        // createSymlink: true,          // 创建当前日志符号链接
        // maxZipFiles: 10,              // 保留的压缩归档数量
        // json: true,                   // 写入JSON格式（与format配置二选一）
      },
    },
  },
  db: {
    enable: false,
    client: {
      type: "mysql",
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT || "3306"),
      username: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "",
      entities: [resolve("src/models/**/*{.ts,.js}")],
      migrations: [resolve("src/migrations/**/*{.ts,.js}")],
      poolSize: parseInt(process.env.DB_POOL_SIZE || "10"),
      synchronize: false,
      logging: process.env.NODE_ENV === "development",
    },
  },
  redis: {
    enable: false,
    client: {
      name: process.env.REDIS_MASTER_NAME || "mymaster",
      password: process.env.REDIS_PASSWORD || "",
      db: parseInt(process.env.REDIS_DB || "0"),
      lazyConnect: true,
      sentinels: [
        {
          host: process.env.REDIS_SENTINEL_HOST || "localhost",
          port: parseInt(process.env.REDIS_SENTINEL_PORT || "26379"),
        },
      ],
    },
  },
  session: {
    enable: false,
    prefix: process.env.SESSION_PREFIX || "session:",
    type: "memory",
    client: {
      secret: process.env.SESSION_SECRET || "session",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 1000 * 60 * 60,
      },
    },
  },
  router: {
    cors: {
      origin: process.env.CORS_ORIGIN || "*",
      methods: process.env.CORS_METHODS || "GET,POST,PUT,DELETE,OPTIONS",
      credentials: false,
    },
    routePrefix: process.env.API_PREFIX || "",
    controllers: [resolve("src/controllers/**/*{.ts,.js}")],
    middlewares: [resolve("src/middlewares/**/*{.ts,.js}")],
    interceptors: [resolve("src/interceptors/**/*{.ts,.js}")],
  },
  https: {
    enable: false,
    options: {
      port: parseInt(process.env.HTTPS_PORT || "443"),
      key: resolve(process.env.HTTPS_KEY || "key.pem"),
      cert: resolve(process.env.HTTPS_CERT || "cert.pem"),
    },
  },
} as IConfig;
