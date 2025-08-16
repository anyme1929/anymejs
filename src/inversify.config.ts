import { CoreConfig } from "./config";
import { Anyme } from "./core/anyme";
import GracefulExit from "./utils/graceful-exit";
import InversifyAdapter from "./utils/inversify-adapter";
import RouteRegistrar from "./utils/route-registrar";
import { Container, inject } from "inversify";
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
  EntityTarget,
  ObjectLiteral,
  Provider,
} from "./types";
import { SYMBOLS } from "./utils/constants";
type AppProvider = (express?: Application) => Promise<Anyme>;
class DI {
  static container: Container = new Container({
    autobind: true,
    defaultScope: "Singleton",
  });
  static registered = false;
  static register() {
    if (this.registered) return;
    // 0. 注册配置服务 getAsync 获取
    this.container.bind(SYMBOLS.CoreConfig).to(CoreConfig);
    this.container
      .bind<Provider<any[] | IConfig>>(SYMBOLS.ConfigProvider)
      .toProvider((ctx) => {
        const coreConfig = ctx.get<CoreConfig>(SYMBOLS.CoreConfig);
        return async (name?: string) => await coreConfig.load(name);
      });
    this.container
      .bind(SYMBOLS.Config)
      .toResolvedValue(
        async (coreConfig: CoreConfig) => await coreConfig.load(),
        [SYMBOLS.CoreConfig]
      );
    this.container
      .bind(SYMBOLS.Logger)
      .toResolvedValue(
        (config: IConfig) => new WinstonLogger(config.logger).logger,
        [SYMBOLS.Config]
      );

    this.container
      .bind<IocAdapter>(SYMBOLS.IocAdapter)
      .toConstantValue(new InversifyAdapter(this.container));
    // 注册数据库连接服务
    this.container
      .bind(SYMBOLS.DataSource)
      .toResolvedValue(
        (config: IConfig) => CreateDataSource(config.db),
        [SYMBOLS.Config]
      );

    // 注册 Redis 服务
    this.container
      .bind(SYMBOLS.Redis)
      .toResolvedValue(
        (config: IConfig, logger: Logger) => CreateRedis(config.redis, logger),
        [SYMBOLS.Config, SYMBOLS.Logger]
      );

    // 注册会话处理服务
    this.container
      .bind(SYMBOLS.CreateSession)
      .toResolvedValue(
        (config: IConfig) => new CreateSession(config.session.client),
        [SYMBOLS.Config]
      );
    this.container
      .bind(SYMBOLS.GracefulExit)
      .toResolvedValue(
        (logger: Logger) => new GracefulExit(logger),
        [SYMBOLS.Logger]
      );

    // 6. 注册服务器创建服务
    this.container
      .bind<CreateServer>(SYMBOLS.CreateServer)
      .toResolvedValue(
        (iocAdapter: IocAdapter, logger: Logger) =>
          new CreateServer(iocAdapter, logger),
        [SYMBOLS.IocAdapter, SYMBOLS.Logger]
      );
    this.container.bind(SYMBOLS.RouteRegistrar).to(RouteRegistrar);
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
  static createApp = (express: Application): Promise<Anyme> =>
    this.container.get<AppProvider>(SYMBOLS.App)(express);
  static injectLogger = () => inject(SYMBOLS.Logger);
  static injectRedis = () => inject(SYMBOLS.Redis);
  static injectDataSource = () => inject(SYMBOLS.DataSource);
  static injectConfig = () => inject(SYMBOLS.ConfigProvider);
  static injectRepository = <T extends ObjectLiteral>(
    entity: EntityTarget<T>
  ): ParameterDecorator => {
    // 获取实体唯一标识
    const entityName =
      typeof entity === "function"
        ? entity.name
        : (entity as any).name || entity.toString();
    const token = Symbol.for(`Repository_${entityName}`);
    if (!this.container.isBound(token))
      this.container
        .bind(token)
        .toResolvedValue(
          (dataSource: DataSource) => {
            return dataSource.getRepository(entity);
          },
          [SYMBOLS.DataSource]
        )
        .inRequestScope();
    return inject(token);
  };
}
DI.register();
export { DI };
