import { type RedisOptions } from "ioredis";
import { type SessionOptions } from "express-session";
import { type DataSourceOptions } from "typeorm";
import { type RoutingControllersOptions } from "routing-controllers";
import { type HealthCheckMap } from "@godaddy/terminus";
import { type Application, type RequestHandler } from "express";
import { type Redis } from "ioredis";
import { type Logger, type Logform, type transports } from "winston";
import { type DailyRotateFileTransportOptions } from "winston-daily-rotate-file";
import { type Server } from "node:http";
/**
 * 应用程序配置接口，包含所有可配置项
 */
export interface IConfig {
  /** 静态资源公共目录路径 */
  public_path: string;
  /** 应用监听端口号 */
  port: number;
  logger: {
    level: "info" | "debug" | "warn" | "error" | "http" | "verbose";
    format: Logform.Format;
    transports: {
      console: transports.ConsoleTransportOptions | false;
      file: DailyRotateFileTransportOptions | false;
    };
  };
  /** 数据库配置选项 */
  db: {
    /** 是否启用数据库连接 */
    enable: boolean;
    /** 数据库连接配置 */
    client: DataSourceOptions;
  };
  /** Redis 配置选项 */
  redis: {
    /** 是否启用 Redis 连接 */
    enable: boolean;
    /** Redis 连接配置 */
    client: RedisOptions;
  };
  /** Session 配置选项 */
  session: {
    /** 是否启用 Session 支持 */
    enable: boolean;
    /** Session 键名前缀 */
    prefix: string;
    /** Session 存储类型（内存或 Redis） */
    type: "memory" | "redis";
    /** Session 客户端配置 */
    client: SessionOptions;
  };
  /** 路由配置选项 */
  router: RoutingControllersOptions;
  https: {
    enable: boolean;
    options: {
      port: number;
      key: string;
      cert: string;
    };
  };
}
/**
 * GracefulExit 类的接口定义，包含优雅退出功能的相关属性和方法
 */
export interface IGracefulExit {
  /**
   * 添加资源关闭任务
   * @param task 返回 Promise 的资源关闭函数
   */
  addCleanupTask(task: () => Promise<void>): void;

  /**
   * 为 HTTP 服务器设置优雅退出
   * @param server HTTP 服务器实例
   * @param options 可选配置，包含超时时间和监听的信号
   */
  register<T extends Server>(
    server: T,
    options?: {
      timeout?: number;
      signals?: NodeJS.Signals[];
      healthCheck?: HealthCheckMap;
    }
  ): IGracefulExit;
}

/**
 * CreateServer 类的接口定义，包含创建和启动服务器的相关属性和方法
 */
export interface ICreateServer {
  /**
   * 启动服务器
   * @param port 服务器监听的端口号
   * @returns 解析为 Server 实例的 Promise
   */
  init(app: Application, config: IConfig["router"]): ICreateServer;
  bootstrap(port: number): Promise<Server>;
}

export interface ICreateSession {
  getHandler(): RequestHandler;
  setRedis(prefix: string, redis: Redis): void;
}

export interface IHandler {
  name: string;
  handle: RequestHandler;
}
export interface IGlobalMiddlewares {
  routers: Map<string, RequestHandler | RequestHandler[]>;
  init(app: Application): IGlobalMiddlewares;
  register(...handlers: (RequestHandler | IHandler)[]): void;
}
export interface LoadEnvOptions {
  cwd?: string;
  override?: boolean;
}
