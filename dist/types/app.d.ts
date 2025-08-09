import { DataSource } from 'typeorm';
import { Redis } from 'ioredis';
import { Logger } from 'winston';
import { Server } from 'node:http';
import { Application, RequestHandler } from 'express';
import { IConfig, ICreateSession, ICreateServer, IGracefulExit, IGlobalMiddlewares, IHandler } from './types/interfaces.js';

declare class App {
    private config;
    private logger;
    private createSession;
    private serverFactory;
    private gracefulExit;
    private globalMiddlewares;
    private dataSource?;
    private redis?;
    app: Application;
    private server;
    constructor(config: IConfig, logger: Logger, createSession: ICreateSession, serverFactory: (app: Application) => Promise<ICreateServer>, gracefulExit: IGracefulExit, globalMiddlewares: IGlobalMiddlewares, dataSource?: DataSource | undefined, redis?: Redis | undefined);
    bootstrap(port?: number): Promise<Server>;
    use(...handlers: (IHandler | RequestHandler)[]): void;
    private initialize;
    private initDatabase;
    private initRedis;
    private configSession;
    private cinfigGlobalMiddlewares;
}

export { App };
