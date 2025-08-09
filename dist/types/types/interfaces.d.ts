import { RedisOptions, Redis } from 'ioredis';
import { SessionOptions } from 'express-session';
import { DataSourceOptions } from 'typeorm';
import { RoutingControllersOptions } from 'routing-controllers';
import { HealthCheckMap } from '@godaddy/terminus';
import { RequestHandler, Application } from 'express';
import { Server } from 'node:http';

interface IConfig {
    public_path: string;
    port: number;
    node_env: string;
    is_dev: boolean;
    api_prefix: string;
    db: {
        enable: boolean;
        client: DataSourceOptions;
    };
    redis: {
        enable: boolean;
        client: RedisOptions;
    };
    session: {
        enable: boolean;
        prefix: string;
        type: "memory" | "redis";
        client: SessionOptions;
    };
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
interface IGracefulExit {
    addCleanupTask(task: () => Promise<void>): void;
    setHealthCheck(healthCheck: HealthCheckMap): void;
    register<T extends Server>(server: T, options?: {
        timeout?: number;
        signals?: NodeJS.Signals[];
    }): IGracefulExit;
}
interface ICreateServer {
    bootstrap(port: number): Promise<Server>;
}
interface ICreateSession {
    getHandler(): RequestHandler;
    setRedis(prefix: string, redis: Redis): void;
}
interface IHandler {
    name: string;
    handle: RequestHandler;
}
interface IGlobalMiddlewares {
    routers: Map<string, RequestHandler | RequestHandler[]>;
    init(app: Application): IGlobalMiddlewares;
    register(...handlers: (RequestHandler | IHandler)[]): void;
}
type DeepPartial<T> = {
    [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};
type userConfig = DeepPartial<IConfig>;

export type { DeepPartial, IConfig, ICreateServer, ICreateSession, IGlobalMiddlewares, IGracefulExit, IHandler, userConfig };
