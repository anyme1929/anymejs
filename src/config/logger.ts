// 导入 winston 日志库
import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
/**
 * 创建一个 winston 日志记录器实例
 * 根据不同的环境设置日志级别，开发环境使用 debug 级别，生产环境使用 info 级别
 * 配置日志格式为包含时间戳、错误堆栈信息的 JSON 格式
 * 并指定日志输出到控制台
 */
const is_dev = process.env.NODE_ENV === "development";
const level = is_dev ? "debug" : "info";
const logger = winston.createLogger({
  // 根据 NODE_ENV 环境变量设置日志级别，开发环境为 debug，其他环境为 info
  level,
  // 组合多个日志格式
  format: winston.format.combine(
    // 添加时间戳，格式为 "YYYY-MM-DD HH:mm:ss"
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    // 捕获错误堆栈信息
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.printf(({ timestamp, level, message, stack }) => {
      const l = level.toUpperCase();
      return stack
        ? `${timestamp} [${l}] ${message}\n${stack}`
        : `${timestamp} [${l}] ${message}`;
    })
  ),
  // 定义日志输出的传输方式
  transports: [
    // 配置控制台输出的日志传输
    new winston.transports.Console({
      // 组合控制台输出的日志格式
      format: winston.format.combine(winston.format.colorize({ all: true })),
    }),
    new DailyRotateFile({
      filename: "logs/app-%DATE%.log", // 文件名模式（含日期占位符）
      datePattern: "YYYY-MM-DD", // 日期格式（每天一个文件）
      zippedArchive: true, // 启用旧日志压缩归档
      maxSize: "20m", // 单个文件最大尺寸（20MB）
      maxFiles: is_dev ? "7d" : "30d", // 保留周期（开发环境7天，生产环境30天）
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
    }),
  ],
});
export default logger;
