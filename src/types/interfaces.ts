import { type RedisOptions } from "ioredis";
import { type SessionOptions } from "express-session";
import { type DataSourceOptions } from "typeorm";
import { type RoutingControllersOptions } from "routing-controllers";
import { type HealthCheckMap } from "@godaddy/terminus";
import { type Application, type RequestHandler } from "express";
import { type Redis } from "ioredis";
import { type Server } from "node:http";
// // 模拟请求对象类型
// interface Request {
//   method: string;
//   url: string;
//   headers: Record<string, string | string[] | undefined>;
//   httpVersion: string;
//   // 其他可能的属性
//   connection?: any;
//   socket?: any;
// }

// // 模拟响应对象类型
// interface Response {
//   statusCode: number;
//   statusMessage?: string;
//   headers: Record<string, string | string[] | undefined>;

//   writeHead(statusCode: number, statusMessage?: string): void;
//   writeHead(
//     statusCode: number,
//     headers?: Record<string, string | string[]>
//   ): void;

//   write(chunk: string | Buffer, encoding?: BufferEncoding): boolean;

//   end(cb?: () => void): void;
//   end(chunk: string | Buffer, cb?: () => void): void;
//   end(chunk: string | Buffer, encoding?: BufferEncoding, cb?: () => void): void;

//   setHeader(name: string, value: string | string[]): void;
//   getHeader(name: string): string | string[] | undefined;
//   removeHeader(name: string): void;
// }

// // 事件监听器类型
// type ServerEventListener<Event extends keyof ServerEvents> =
//   ServerEvents[Event] extends (...args: infer Args) => any
//     ? (...args: Args) => void
//     : never;

// // 服务器事件类型映射
// interface ServerEvents {
//   request: (req: Request, res: Response) => void;
//   connection: (socket: any) => void;
//   close: () => void;
//   error: (err: Error) => void;
//   listening: () => void;
// }

// // 请求监听器类型
// type RequestListener = (req: Request, res: Response) => void;
// // 服务器接口类型
// export interface Server {
//   // 事件相关方法
//   on<Event extends keyof ServerEvents>(
//     event: Event,
//     listener: ServerEventListener<Event>
//   ): this;

//   off<Event extends keyof ServerEvents>(
//     event: Event,
//     listener: ServerEventListener<Event>
//   ): this;

//   // 服务器控制方法
//   listen(
//     port: number,
//     hostname?: string,
//     backlog?: number,
//     callback?: () => void
//   ): this;
//   listen(port: number, hostname?: string, callback?: () => void): this;
//   listen(port: number, callback?: () => void): this;

//   close(callback?: (err?: Error) => void): this;

//   // 其他可能的属性和方法
//   address(): { port: number; family: string; address: string } | null;
//   maxHeadersCount: number | null;
// }

/**
 * 应用程序配置接口，包含所有可配置项
 */
export interface IConfig {
  /** 静态资源公共目录路径 */
  public_path: string;
  /** 应用监听端口号 */
  port: number;
  /** Node.js 环境类型（如 'development'、'production'） */
  node_env: string;
  /** 是否为开发环境 */
  is_dev: boolean;
  /** API 路由全局前缀 */
  api_prefix: string;
  logger: {
    level: "info" | "debug" | "warn" | "error" | "";
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
   * 添加健康检查端点
   * @param healthCheck 健康检查配置
   */
  setHealthCheck(healthCheck: HealthCheckMap): void;

  /**
   * 为 HTTP 服务器设置优雅退出
   * @param server HTTP 服务器实例
   * @param options 可选配置，包含超时时间和监听的信号
   */
  register<T extends Server>(
    server: T,
    options?: { timeout?: number; signals?: NodeJS.Signals[] }
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
  bootstrap(port: number): Promise<Server>;
}

export interface ICreateSession {
  getHandler(): RequestHandler;
  setRedis(prefix: string, redis: Redis): void;
}

export interface IDataSource {
  isInitialized: boolean;
  initialize(): Promise<void>;
  destroy(): Promise<void>;
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
// 新增类型工具
export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};
export type userConfig = DeepPartial<IConfig>;
