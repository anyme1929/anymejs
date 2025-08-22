import { createParamDecorator } from "routing-controllers";
import { CoreConfig } from "./config";
import { Anyme } from "./core/anyme";
import GracefulExit from "./utils/graceful-exit";
import InversifyAdapter from "./utils/inversify-adapter";
import { Container, inject } from "inversify";
import {
  ADataSource,
  ARedis,
  CreateServer,
  WinstonLogger,
  Middleware,
  ACache,
} from "./core";
import type {
  Application,
  Logger,
  IConfig,
  IocAdapter,
  DataSource,
  Redis,
  Cluster,
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
      .bind(SYMBOLS.Cache)
      .toResolvedValue(
        (config: IConfig) => new ACache(config.cache),
        [SYMBOLS.Config]
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
        (logger: Logger, config: IConfig) => new ADataSource(logger, config.db),
        [SYMBOLS.Logger, SYMBOLS.Config]
      );

    // 注册 Redis 服务
    this.container
      .bind(SYMBOLS.Redis)
      .toResolvedValue(
        (config: IConfig, logger: Logger) => new ARedis(config.redis, logger),
        [SYMBOLS.Config, SYMBOLS.Logger]
      );

    this.container
      .bind(SYMBOLS.Middleware)
      .toResolvedValue(
        (logger: Logger) => new Middleware(logger),
        [SYMBOLS.Logger]
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
    this.container.bind<Provider<Anyme>>(SYMBOLS.App).toProvider((ctx) => {
      let instance: Anyme | undefined = undefined;
      return async (express: Application) => {
        if (!instance)
          instance = new Anyme(
            express,
            await ctx.getAsync<IConfig>(SYMBOLS.Config),
            ctx.get<Logger>(SYMBOLS.Logger),
            ctx.get<CreateServer>(SYMBOLS.CreateServer),
            ctx.get<GracefulExit>(SYMBOLS.GracefulExit),
            ctx.get<Middleware>(SYMBOLS.Middleware),
            ctx.get<ARedis>(SYMBOLS.Redis),
            ctx.get<ACache>(SYMBOLS.Cache),
            ctx.get<ADataSource>(SYMBOLS.DataSource)
          );
        return instance;
      };
    });
    this.registered = true;
  }
  static createApp = (express: Application): Promise<Anyme> =>
    this.container.get<AppProvider>(SYMBOLS.App)(express);
  static Redis = (key?: string) => {
    return createParamDecorator({
      value: () => this.container.get<ARedis>(SYMBOLS.Redis).get(key),
    });
  };
  static Cache = () => {
    return createParamDecorator({
      value: () => this.container.get<ACache>(SYMBOLS.Cache),
    });
  };
  static injectLogger = (): MethodDecorator &
    ParameterDecorator &
    PropertyDecorator => inject(SYMBOLS.Logger);
  static injectRedis = (): MethodDecorator &
    ParameterDecorator &
    PropertyDecorator => inject(SYMBOLS.Redis);
  static injectCache = (): MethodDecorator &
    ParameterDecorator &
    PropertyDecorator => inject(SYMBOLS.Cache);
  static injectDataSource = (): MethodDecorator &
    ParameterDecorator &
    PropertyDecorator => inject(SYMBOLS.DataSource);
  static injectConfig = (): MethodDecorator &
    ParameterDecorator &
    PropertyDecorator => inject(SYMBOLS.ConfigProvider);
  static injectRepository = <T extends ObjectLiteral>(
    entity: EntityTarget<T>
  ): MethodDecorator & ParameterDecorator & PropertyDecorator => {
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
export default DI;
