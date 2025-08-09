import "reflect-metadata";
import { CoreConfig } from "./core.config";
import { App } from "./app";
import GracefulExit from "./utils/graceful-exit";
import InversifyAdapter from "./utils/inversify-adapter";
import GlobalMiddlewares from "./utils/global-middlewares";
import { Container, type Provider } from "inversify";
import {
  CreateDataSource,
  CreateRedis,
  CreateServer,
  logger,
  CreateSession,
} from "./config";
import {
  Application,
  Logger,
  IConfig,
  SYMBOLS,
  IocAdapter,
  IGlobalMiddlewares,
} from "./types";

class DI {
  static container: Container = new Container();
  static register() {
    this.container
      .bind(SYMBOLS.Config)
      .toDynamicValue(async () => {
        return await new CoreConfig().loadConfig();
      })
      .inSingletonScope();
    // 1. 注册日志服务
    this.container.bind(SYMBOLS.Logger).toConstantValue(logger);
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

    // 4. 注册 Redis 服务
    this.container
      .bind(SYMBOLS.Redis)
      .toResolvedValue(
        (config: IConfig) => {
          const { redis } = config;
          return CreateRedis(redis);
        },
        [SYMBOLS.Config]
      )
      .inSingletonScope();

    // 5. 注册会话处理服务
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
      .bind<Provider<CreateServer>>(SYMBOLS.CreateServer)
      .toProvider((ctx) => {
        let instance: CreateServer | undefined = undefined;
        const iocAdapter = ctx.get<IocAdapter>(SYMBOLS.IocAdapter);
        return async (app: Application) => {
          const { router } = await ctx.getAsync<IConfig>(SYMBOLS.Config);
          if (!instance) instance = new CreateServer(router, iocAdapter, app);
          return instance;
        };
      });

    // 7. 注册优雅退出服务
    this.container
      .bind(SYMBOLS.GracefulExit)
      .toResolvedValue(
        (logger: Logger) => new GracefulExit(logger),
        [SYMBOLS.Logger]
      )
      .inSingletonScope();
    // 8. 注册全局中间件服务
    this.container
      .bind<IGlobalMiddlewares>(SYMBOLS.GlobalMiddlewares)
      .to(GlobalMiddlewares)
      .inSingletonScope();
    this.container.bind(SYMBOLS.App).to(App);
  }
  static async getApp(): Promise<App> {
    return await this.container.getAsync<App>(SYMBOLS.App);
  }
}
DI.register();
export { DI };
