import type {
  RedisOptions,
  Redis,
  ClusterNode,
  ClusterOptions,
  Cluster,
} from "ioredis";
import type { SessionOptions } from "express-session";
import type { DataSourceOptions, DataSource } from "typeorm";
import type { Application } from "express";
import type { RoutingControllersOptions } from "routing-controllers";
import type { Logger, Logform, transports } from "winston";
import type { DailyRotateFileTransportOptions } from "winston-daily-rotate-file";
import type { Options as RateLimitOptions } from "express-rate-limit";
import type { Options as SlowDownOptions } from "express-slow-down";
export type { Application, Logger };
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
export interface RedisClusterOpt {
  cluster: boolean;
  node: ClusterNode[];
  options?: ClusterOptions;
}
export type RedisOpt = RedisOptions | RedisClusterOpt;
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
    client?: DataSourceOptions;
    default?: DataSourceOptions;
    clients?: {
      [key: string]: DataSourceOptions;
    };
  };
  /** Redis 配置选项 */
  redis: {
    /** 是否启用 Redis 连接 */
    enable: boolean;
    /** Redis 连接配置 */
    client?: RedisOpt;
    default?: RedisOpt;
    clients?: {
      [key: string]: RedisOpt;
    };
  };
  /** Session 配置选项 */
  session: {
    /** 是否启用 Session 支持 */
    enable: boolean;
    /** Session 键名前缀 */
    prefix: string;
    /** Session 存储类型（内存或 Redis） */
    type: "memory" | "redis";
    redis: string;
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
  limiter: {
    /** 是否启用限流 */
    enable: boolean;
    /** 限流规则 */
    rules?:
      | {
          /** 限流配置 */
          [key: string]:
            | [Partial<SlowDownOptions>, Partial<RateLimitOptions>]
            | {
                slowDownOptions?: Partial<SlowDownOptions>;
                rateLimitOptions?: Partial<RateLimitOptions>;
              };
        }[]
      | {
          slowDownOptions?: Partial<SlowDownOptions>;
          rateLimitOptions?: Partial<RateLimitOptions>;
        };
  };
  cache: CacheOptions;
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

export interface IMiddleware {
  register(app: Application): IMiddleware;
  applySession(config: IConfig["session"], redis?: IRedis);
  applyRoute();
  applyLimiter(config: IConfig["limiter"]);
}
export interface IHandler {
  name: string;
  handle: RequestHandler;
}
export interface IRedis {
  connectAll(): Promise<
    (
      | "end"
      | "close"
      | "wait"
      | "connecting"
      | "connect"
      | "ready"
      | "reconnecting"
      | "disconnecting"
    )[]
  >;
  get(name?: string): Redis | Cluster;
  getAll(): Map<string, Redis | Cluster>;
  close(name?: string): Promise<void>;
  closeAll(): Promise<void>;
}
export interface IDataSource {
  connectAll(): Promise<void[]>;
  get(name?: string): DataSource;
  getAll(): Map<string, DataSource>;
  close(name?: string): Promise<void>;
  closeAll(): Promise<void>;
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
/**
 * 缓存配置选项接口
 */
export interface CacheOptions {
  /**
   * 最大缓存容量（项目数量），默认1000
   */
  maxSize?: number;

  /**
   * 最大内存使用量（字节），0表示无限制，默认0
   */
  maxMemorySize?: number;

  /**
   * 缓存淘汰策略，默认'lru'
   */
  evictionPolicy?: EvictionPolicy;

  /**
   * 定期清理过期项的间隔时间(毫秒)，默认60000(1分钟)
   */
  cleanupIntervalMs?: number;
}
/**
 * 缓存统计信息接口
 */
export interface CacheStats {
  /**
   * 缓存命中次数
   */
  hits: number;

  /**
   * 缓存未命中次数
   */
  misses: number;

  /**
   * 当前缓存大小（项目数量）
   */
  size: number;

  /**
   * 最大缓存容量（项目数量）
   */
  maxSize: number;

  /**
   * 被淘汰的缓存项数量
   */
  evictions: number;

  /**
   * 当前内存使用量（字节）
   */
  memorySize: number;

  /**
   * 最大内存使用量（字节）
   */
  maxMemorySize: number;
}
/**
 * 缓存项接口
 */
export interface CacheItem<T> {
  /**
   * 缓存的值
   */
  value: T;

  /**
   * 缓存项大小估算（字节）
   */
  size: number;

  /**
   * 创建时间戳(毫秒)
   */
  createdAt: number;

  /**
   * 过期时间戳(毫秒)，undefined表示永不过期
   */
  expiresAt?: number;

  /**
   * 最后访问时间戳(毫秒)
   */
  lastAccessed: number;

  /**
   * 访问次数
   */
  accessCount: number;
}
/**
 * 批量设置缓存项的参数接口
 */
export interface MSetEntry<T = any> {
  /**
   * 缓存键
   */
  key: string;

  /**
   * 缓存值
   */
  value: T;

  /**
   * 过期时间(毫秒)，undefined表示永不过期
   */
  ttl?: number;
}
/**
 * 内存缓存接口定义
 */
export interface ICache<T = any> {
  /**
   * 获取缓存项
   * @param key 缓存键
   * @returns 缓存值，如果不存在或已过期则返回undefined
   */
  get(key: string): T | undefined;

  /**
   * 批量获取缓存项
   * @param keys 缓存键数组
   * @returns 键值对对象，包含所有存在的缓存项
   */
  mget(keys: string[]): Record<string, T | undefined>;

  /**
   * 设置缓存项
   * @param key 缓存键
   * @param value 缓存值
   * @param ttl 过期时间(毫秒)，undefined表示永不过期
   * @returns 是否设置成功
   */
  set(key: string, value: T, ttl?: number): boolean;

  /**
   * 批量设置缓存项
   * @param entries 缓存项数组
   * @returns 成功设置的项目数量
   */
  mset(entries: MSetEntry<T>[]): number;

  /**
   * 获取缓存项，如果不存在则设置
   * @param key 缓存键
   * @param factory 用于生成值的工厂函数
   * @param ttl 过期时间(毫秒)，可选
   * @returns 缓存值
   */
  getOrSet(
    key: string,
    factory: () => T | Promise<T>,
    ttl?: number
  ): Promise<T>;

  /**
   * 删除缓存项
   * @param key 缓存键
   * @returns 如果成功删除则返回true，否则返回false
   */
  delete(key: string): boolean;

  /**
   * 批量删除缓存项
   * @param keys 缓存键数组
   * @returns 成功删除的项目数量
   */
  deleteMany(keys: string[]): number;

  /**
   * 清空所有缓存项
   */
  clear(): void;

  /**
   * 检查缓存项是否存在且未过期
   * @param key 缓存键
   * @returns 如果存在且未过期则返回true，否则返回false
   */
  has(key: string): boolean;

  /**
   * 获取缓存中所有的键
   * @returns 键的数组
   */
  keys(): string[];

  /**
   * 获取缓存统计信息
   * @returns 缓存统计信息
   */
  getStats(): Readonly<CacheStats>;

  /**
   * 重置统计信息（除了大小限制）
   */
  resetStats(): void;

  /**
   * 关闭缓存，清理资源
   */
  close(): void;
}
