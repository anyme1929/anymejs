import { CoreConfig } from "./config";
import { Anyme } from "./core/anyme";
import GracefulExit from "./utils/graceful-exit";
import InversifyAdapter from "./utils/inversify-adapter";
import RouteRegistrar from "./utils/route-registrar";
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
  DataSource,
  Redis,
} from "./types";
import { SYMBOLS } from "./utils/constants";
type AppProvider = (express?: Application) => Promise<Anyme>;
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

    this.container
      .bind(SYMBOLS.Logger)
      .toResolvedValue(
        (config: IConfig) => new WinstonLogger(config.logger).logger,
        [SYMBOLS.Config]
      )
      .inSingletonScope();

    this.container
      .bind<IocAdapter>(SYMBOLS.IocAdapter)
      .toConstantValue(new InversifyAdapter(this.container));
    // 注册数据库连接服务
    this.container
      .bind(SYMBOLS.DataSource)
      .toResolvedValue(
        (config: IConfig) => CreateDataSource(config.db),
        [SYMBOLS.Config]
      )
      .inSingletonScope();

    // 注册 Redis 服务
    this.container
      .bind(SYMBOLS.Redis)
      .toResolvedValue(
        (config: IConfig, logger: Logger) => CreateRedis(config.redis, logger),
        [SYMBOLS.Config, SYMBOLS.Logger]
      )
      .inSingletonScope();

    // 注册会话处理服务
    this.container
      .bind(SYMBOLS.CreateSession)
      .toResolvedValue(
        (config: IConfig) => new CreateSession(config.session.client),
        [SYMBOLS.Config]
      )
      .inSingletonScope();
    this.container
      .bind(SYMBOLS.GracefulExit)
      .toResolvedValue(
        (logger: Logger) => new GracefulExit(logger),
        [SYMBOLS.Logger]
      )
      .inSingletonScope();

    // 6. 注册服务器创建服务
    this.container
      .bind<CreateServer>(SYMBOLS.CreateServer)
      .toResolvedValue(
        (iocAdapter: IocAdapter, logger: Logger) =>
          new CreateServer(iocAdapter, logger),
        [SYMBOLS.IocAdapter, SYMBOLS.Logger]
      )
      .inSingletonScope();
    this.container
      .bind(SYMBOLS.RouteRegistrar)
      .to(RouteRegistrar)
      .inSingletonScope();
    this.container.bind<Provider<Anyme>>(SYMBOLS.App).toProvider((ctx) => {
      let instance: Anyme | undefined = undefined;
      return async (express: Application) => {
        const config = await ctx.getAsync<IConfig>(SYMBOLS.Config);
        const logger = await ctx.getAsync<Logger>(SYMBOLS.Logger);
        const createSession = await ctx.getAsync<CreateSession>(
          SYMBOLS.CreateSession
        );
        const createServer = ctx.get<CreateServer>(SYMBOLS.CreateServer);
        const gracefulExit = await ctx.getAsync<GracefulExit>(
          SYMBOLS.GracefulExit
        );
        const routeRegistrar = ctx.get<RouteRegistrar>(SYMBOLS.RouteRegistrar);
        const dataSource = await ctx.getAsync<DataSource | undefined>(
          SYMBOLS.DataSource
        );
        const redis = await ctx.getAsync<Redis | undefined>(SYMBOLS.Redis);
        if (!instance)
          instance = new Anyme(
            express,
            config,
            logger,
            createServer,
            createSession,
            gracefulExit,
            routeRegistrar,
            dataSource,
            redis
          );
        return instance;
      };
    });
    this.registered = true;
  }
  static createApp = (express: Application): Promise<Anyme> => {
    return this.container.get<AppProvider>(SYMBOLS.App)(express);
  };
}
DI.register();
export { DI };
