import { createParamDecorator, type IocAdapter } from "routing-controllers";
import { Container, inject, type Provider } from "inversify";
import { type EntityTarget, type ObjectLiteral } from "typeorm";
import { CoreConfig } from "./config";
import { SYMBOLS } from "./utils/constants";
import InversifyAdapter from "./utils/inversify-adapter";
import {
  Anyme,
  ARedis,
  ACache,
  ADataSource,
  CreateServer,
  WinstonLogger,
  Middleware,
  GracefulExit,
} from "./core";
import type { Application, Logger, IConfig } from "./types";
class DI {
  static container: Container = new Container({
    autobind: true,
    defaultScope: "Singleton",
  });
  static registered = false;
  static register() {
    if (this.registered) return;
    // 配置
    this.container.bind(SYMBOLS.CoreConfig).to(CoreConfig);
    this.container
      .bind(SYMBOLS.Config)
      .toResolvedValue(
        async (coreConfig: CoreConfig) => await coreConfig.loadCore(),
        [SYMBOLS.CoreConfig]
      );
    this.container
      .bind<Provider<object | undefined>>(SYMBOLS.ConfigProvider)
      .toProvider((ctx) => {
        const coreConfig = ctx.get<CoreConfig>(SYMBOLS.CoreConfig);
        return async (name?: string) => await coreConfig.get(name);
      });
    // Cache
    this.container
      .bind(SYMBOLS.Cache)
      .toResolvedValue(
        (config: IConfig) => new ACache(config.cache),
        [SYMBOLS.Config]
      );
    // Logger
    this.container
      .bind(SYMBOLS.Logger)
      .toResolvedValue(
        (config: IConfig) => new WinstonLogger(config.logger).logger,
        [SYMBOLS.Config]
      );
    // IocAdapter
    this.container
      .bind<IocAdapter>(SYMBOLS.IocAdapter)
      .toConstantValue(new InversifyAdapter(this.container));
    // DataSource
    this.container
      .bind(SYMBOLS.DataSource)
      .toResolvedValue(
        (logger: Logger, config: IConfig) => new ADataSource(logger, config.db),
        [SYMBOLS.Logger, SYMBOLS.Config]
      );

    // Redis
    this.container
      .bind(SYMBOLS.Redis)
      .toResolvedValue(
        (config: IConfig, logger: Logger) => new ARedis(config.redis, logger),
        [SYMBOLS.Config, SYMBOLS.Logger]
      );
    // Middleware
    this.container
      .bind(SYMBOLS.Middleware)
      .toResolvedValue(
        (logger: Logger) => new Middleware(logger),
        [SYMBOLS.Logger]
      );
    //GracefulExit
    this.container
      .bind(SYMBOLS.GracefulExit)
      .toResolvedValue(
        (logger: Logger) => new GracefulExit(logger),
        [SYMBOLS.Logger]
      );
    //CreateServer
    this.container
      .bind<CreateServer>(SYMBOLS.CreateServer)
      .toResolvedValue(
        (iocAdapter: IocAdapter, logger: Logger) =>
          new CreateServer(iocAdapter, logger),
        [SYMBOLS.IocAdapter, SYMBOLS.Logger]
      );
    //Anyme
    this.container.bind<Provider<Anyme>>(SYMBOLS.App).toProvider((ctx) => {
      let instance: Anyme | undefined = undefined;
      return async (app: Application) => {
        if (!instance)
          instance = new Anyme(
            app,
            await ctx.getAsync<IConfig>(SYMBOLS.Config),
            ctx.get<Logger>(SYMBOLS.Logger),
            ctx.get<CreateServer>(SYMBOLS.CreateServer),
            ctx.get<GracefulExit>(SYMBOLS.GracefulExit),
            ctx.get<Middleware>(SYMBOLS.Middleware),
            ctx.get<ARedis>(SYMBOLS.Redis),
            ctx.get<ADataSource>(SYMBOLS.DataSource)
          );
        return instance;
      };
    });
    this.registered = true;
  }
  static createApp = (app: Application): Promise<Anyme> =>
    this.container.get<Provider<Anyme>>(SYMBOLS.App)(app);
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
    entity: EntityTarget<T>,
    options?: {
      dataSource?: string;
    }
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
          (dataSource: ADataSource) => {
            return dataSource
              .get(options?.dataSource ?? "default")
              ?.getRepository(entity);
          },
          [SYMBOLS.DataSource]
        )
        .inRequestScope();
    return inject(token);
  };
}

export default DI;
