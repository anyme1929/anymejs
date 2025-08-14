import { CoreConfig } from "./config";
import { App } from "./core/app";
import GracefulExit from "./utils/graceful-exit";
import InversifyAdapter from "./utils/inversify-adapter";
import { Container, type Provider } from "inversify";
import {
  CreateDataSource,
  CreateRedis,
  CreateServer,
  WinstonLogger,
  CreateSession,
} from "./core";
import type {
  Application,
  Logger,
  IConfig,
  IocAdapter,
  ICreateSession,
  IGracefulExit,
  ICreateServer,
  DataSource,
  Redis,
} from "./types";
import { SYMBOLS } from "./utils/constants";
type AppProvider = (express?: Application) => Promise<App>;
class DI {
  static container: Container = new Container();
  static registered = false;
  static register() {
    if (this.registered) return;
    // 0. 注册配置服务 getAsync 获取
    this.container
      .bind(SYMBOLS.Config)
      .toDynamicValue(async () => await new CoreConfig().load())
      .inSingletonScope();

    // 1. 注册日志服务  getAsync 获取
    this.container
      .bind(SYMBOLS.Logger)
      .toResolvedValue(
        (config: IConfig) => {
          const { logger } = config;
          return new WinstonLogger(logger).logger;
        },
        [SYMBOLS.Config]
      )
      .inSingletonScope();
    // 2. 注册 IocAdapter 服务
    this.container
      .bind<IocAdapter>(SYMBOLS.IocAdapter)
      .toConstantValue(new InversifyAdapter(this.container));
    // 3. 注册数据库连接服务
    this.container
      .bind(SYMBOLS.DataSource)
      .toResolvedValue(
        (config: IConfig) => {
          const { db } = config;
          return CreateDataSource(db);
        },
        [SYMBOLS.Config]
      )
      .inSingletonScope();

    // 4. 注册 Redis 服务  getAsync 获取
    this.container
      .bind(SYMBOLS.Redis)
      .toResolvedValue(
        (config: IConfig, logger: Logger) => {
          const { redis } = config;
          return CreateRedis(redis, logger);
        },
        [SYMBOLS.Config, SYMBOLS.Logger]
      )
      .inSingletonScope();

    // 5. 注册会话处理服务  getAsync 获取
    this.container
      .bind(SYMBOLS.CreateSession)
      .toResolvedValue(
        (config: IConfig) => {
          const { session } = config;
          return new CreateSession(session.client);
        },
        [SYMBOLS.Config]
      )
      .inSingletonScope();

    // 6. 注册服务器创建服务
    this.container
      .bind<CreateServer>(SYMBOLS.CreateServer)
      .toResolvedValue(
        (iocAdapter: IocAdapter, logger: Logger) => {
          return new CreateServer(iocAdapter, logger);
        },
        [SYMBOLS.IocAdapter, SYMBOLS.Logger]
      )
      .inSingletonScope();

    // 7. 注册优雅退出服务  getAsync 获取
    this.container
      .bind(SYMBOLS.GracefulExit)
      .toResolvedValue(
        (logger: Logger) => new GracefulExit(logger),
        [SYMBOLS.Logger]
      )
      .inSingletonScope();
    this.container.bind<Provider<App>>(SYMBOLS.App).toProvider((ctx) => {
      let instance: App | undefined = undefined;
      return async (express: Application) => {
        const config = await ctx.getAsync<IConfig>(SYMBOLS.Config);
        const logger = await ctx.getAsync<Logger>(SYMBOLS.Logger);
        const createSession = await ctx.getAsync<ICreateSession>(
          SYMBOLS.CreateSession
        );
        const gracefulExit = await ctx.getAsync<IGracefulExit>(
          SYMBOLS.GracefulExit
        );
        const createServer = ctx.get<ICreateServer>(SYMBOLS.CreateServer);
        const dataSource = await ctx.getAsync<DataSource | undefined>(
          SYMBOLS.DataSource
        );
        const redis = await ctx.getAsync<Redis | undefined>(SYMBOLS.Redis);
        if (!instance)
          instance = new App(
            express,
            config,
            logger,
            createSession,
            createServer,
            gracefulExit,
            dataSource,
            redis
          );
        return instance;
      };
    });
    this.registered = true;
  }
  static createApp = (express: Application): Promise<App> => {
    return this.container.get<AppProvider>(SYMBOLS.App)(express);
  };
}
DI.register();
export { DI };
