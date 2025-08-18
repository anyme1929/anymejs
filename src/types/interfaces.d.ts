import { type RedisOptions, type Redis } from "ioredis";
import { type SessionOptions } from "express-session";
import { type DataSourceOptions } from "typeorm";
import { type RoutingControllersOptions } from "routing-controllers";
import { type Application, type RequestHandler } from "express";
import { type Logger, type Logform, type transports } from "winston";
import { type DailyRotateFileTransportOptions } from "winston-daily-rotate-file";

export interface HealthCheckMap {
  verbatim?: boolean;
  __unsafeExposeStackTraces?: boolean;
  [key: string]: HealthCheck | boolean | undefined;
}
/**
 * 自定义Server接口，用于替换直接依赖node:http的Server类型
 */
export interface IServer {
  /** 服务器是否正在监听 */
  listening: boolean;

  /**
   * 启动服务器监听
   * @param port 端口号
   * @param hostname 主机名
   * @param backlog 连接队列长度
   * @param callback 启动完成回调函数
   */
  listen(
    port: number,
    hostname: string,
    backlog: number,
    callback: () => void
  ): this;
  listen(port: number, hostname: string, callback: () => void): this;
  listen(port: number, callback: () => void): this;
  listen(port: number, hostname?: string, backlog?: number): this;

  /**
   * 关闭服务器
   * @param callback 关闭完成回调函数
   */
  close(callback?: (error?: Error) => void): this;

  /**
   * 添加事件监听器
   * @param event 事件名称
   * @param listener 事件监听器
   */
  on(event: string, listener: (...args: any[]) => void): this;
  on(event: "error", listener: (err: Error) => void): this;
  on(event: "listening", listener: () => void): this;
}

/**
 * 应用程序配置接口，包含所有可配置项
 */
export interface IConfig {
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
  server: {
    /** 应用监听端口号 */
    port: number;
    proxy: boolean | string | string[];
    https: {
      enable: boolean;
      port: number;
      ssl: {
        key: string;
        cert: string;
        passphrase?: string;
        requestCert?: boolean;
        rejectUnauthorized?: boolean;
        ca?: string[];
      };
    };
    route: RoutingControllersOptions;
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
   * @param IServer HTTP 服务器实例
   * @param options 可选配置，包含超时时间和监听的信号
   */
  register<T extends IServer>(
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
   * @returns 解析为 IServer 实例的 Promise
   */
  init(app: Application, config: IConfig["server"]): ICreateServer;
  bootstrap(port?: number): Promise<IServer>;
}

export interface ICreateSession {
  getHandler(): RequestHandler;
  setRedis(prefix: string, redis: Redis): void;
}

export interface IHandler {
  name: string;
  handle: RequestHandler;
}
export interface LoadEnvOptions {
  cwd?: string;
  override?: boolean;
}
export interface IRouteRegistrar {
  register(app: Application): void;
}
export interface PackageJson {
  name: string;
  version: string;
  description?: string;
  keywords?: string[];
  homepage?: string;
  bugs?: {
    url?: string;
    email?: string;
  };
  license?: string;
  author?:
    | string
    | {
        name: string;
        email?: string;
        url?: string;
      };
  contributors?: (
    | string
    | {
        name: string;
        email?: string;
        url?: string;
      }
  )[];
  files?: string[];
  main?: string;
  browser?: string;
  bin?: string | Record<string, string>;
  man?: string | string[];
  directories?: {
    lib?: string;
    bin?: string;
    man?: string;
    doc?: string;
    example?: string;
    test?: string;
  };
  repository?:
    | {
        type: string;
        url: string;
        directory?: string;
      }
    | string;
  scripts?: Record<string, string>;
  config?: Record<string, any>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  bundledDependencies?: string[];
  engines?: {
    node?: string;
    npm?: string;
    yarn?: string;
  };
  os?: string[];
  cpu?: string[];
  private?: boolean;
  publishConfig?: {
    access?: "public" | "restricted";
    registry?: string;
    tag?: string;
  };
  workspaces?:
    | string[]
    | {
        packages?: string[];
        nohoist?: string[];
      };
}
export interface CtxArgs {
  name: string;
  version: string;
  pkg: PackageJson;
  env: string;
  ENC: (text: string) => string;
  ROOT: string;
  HOME: string;
}
