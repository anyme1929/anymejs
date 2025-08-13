import { resolve } from "node:path";
import { format } from "winston";
import { IConfig } from "../types";
export const ENV_KEY_VALUES = [
  {
    key: "port",
    value: "PORT",
    type: "number",
  },
  { key: "router.routePrefix", value: "API_PREFIX", type: "string" },
  { key: "logger.level", value: "LOG_LEVEL", type: "string" },
  { key: "db.client.host", value: "DB_HOST", type: "string" },
  {
    key: "db.client.port",
    value: "DB_PORT",
    type: "number",
  },
  { key: "db.client.username", value: "DB_USER", type: "string" },
  { key: "db.client.password", value: "DB_PASSWORD", type: "string" },
  { key: "db.client.database", value: "DB_DATABASE", type: "string" },
  { key: "redis.client.name", value: "REDIS_MASTER_NAME", type: "string" },
  { key: "redis.client.username", value: "REDIS_USERNAME", type: "string" },
  { key: "redis.client.host", value: "REDIS_HOST", type: "string" },
  {
    key: "redis.client.port",
    value: "REDIS_PORT",
    type: "number",
  },
  { key: "redis.client.password", value: "REDIS_PASSWORD", type: "string" },
  {
    key: "redis.client.db",
    value: "REDIS_DATABASE",
    type: "string",
  },
  { key: "session.client.secret", value: "SESSION_SECRET", type: "string" },
  {
    key: "session.prefix",
    value: "SESSION_PREFIX",
    type: "string",
  },
  {
    key: "https.options.port",
    value: "HTTPS_PORT",
    type: "number",
  },
  {
    key: "https.options.key",
    value: "HTTPS_KEY",
    type: "resolve",
  },
  {
    key: "https.options.cert",
    value: "HTTPS_CERT",
    type: "resolve",
  },
];
export default {
  public_path: "public",
  port: 3000,
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
      file: false,
      //{
      // filename: "logs/app-%DATE%.log", // 文件名模式（含日期占位符）
      // datePattern: "YYYY-MM-DD", // 日期格式（每天一个文件）
      // zippedArchive: true, // 启用旧日志压缩归档
      // maxSize: "20m", // 单个文件最大尺寸（20MB）
      // maxFiles: process.env.NODE_ENV === "development" ? "7d" : "30d", // 保留周期（开发环境7天，生产环境30天）
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
      // }
    },
  },
  db: {
    enable: false,
    client: {
      type: "mysql",
      host: "localhost",
      port: 3306,
      username: "root",
      entities: [resolve("src/models/**/*{.ts,.js}")],
      migrations: [resolve("src/migrations/**/*{.ts,.js}")],
      poolSize: 5,
      synchronize: false,
      logging: process.env.NODE_ENV === "development",
    },
  },
  redis: {
    enable: false,
    client: {
      lazyConnect: true,
    },
  },
  session: {
    enable: false,
    prefix: "session:",
    type: "memory",
    client: {
      secret: "session",
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
      origin: "*",
      methods: "GET,POST,PUT,DELETE,OPTIONS",
      credentials: false,
    },
    routePrefix: "",
    controllers: [resolve("src/controllers/**/*{.ts,.js}")],
    middlewares: [resolve("src/middlewares/**/*{.ts,.js}")],
    interceptors: [resolve("src/interceptors/**/*{.ts,.js}")],
  },
  https: {
    enable: false,
    options: {
      port: 443,
      key: resolve("key.pem"),
      cert: resolve("cert.pem"),
    },
  },
} as IConfig;
