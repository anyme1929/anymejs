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
  WinstonLogger,
  CreateSession,
} from "./config";
import {
  Application,
  Logger,
  IConfig,
  SYMBOLS,
  IocAdapter,
  IGlobalMiddlewares,
  ICreateSession,
  DataSource,
  IGracefulExit,
  Redis,
} from "./types";
type AppProvider = (express?: Application) => Promise<App>;
class DI {
  static container: Container = new Container();
  static register() {
    // 0. 注册配置服务 getAsync 获取
    this.container
      .bind(SYMBOLS.Config)
      .toDynamicValue(async () => {
        return new Promise((resolve, reject) => {
          setTimeout(() => {
            resolve(new CoreConfig().loadConfig());
          }, 3000);
        });
      })
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
        (config: IConfig) => {
          const { redis } = config;
          return CreateRedis(redis);
        },
        [SYMBOLS.Config]
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

    // 6. 注册服务器创建服务 同步get
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

    // 7. 注册优雅退出服务  getAsync 获取
    this.container
      .bind(SYMBOLS.GracefulExit)
      .toResolvedValue(
        (logger: Logger) => new GracefulExit(logger),
        [SYMBOLS.Logger]
      )
      .inSingletonScope();
    // 8. 注册全局中间件服务  同步get获取
    this.container
      .bind<IGlobalMiddlewares>(SYMBOLS.GlobalMiddlewares)
      .to(GlobalMiddlewares)
      .inSingletonScope();
    this.container.bind(SYMBOLS.App).to(App);
    this.container.bind<Provider<App>>("App").toProvider((ctx) => {
      let instance: App | undefined = undefined;
      //TODO: 待传入EXPRESS实例
      return async () => {
        const config = await ctx.getAsync<IConfig>(SYMBOLS.Config);
        const logger = ctx.get<Logger>(SYMBOLS.Logger);
        const createServer = ctx.get<Provider<CreateServer>>(
          SYMBOLS.CreateServer
        );
        const createSession = ctx.get<ICreateSession>(SYMBOLS.CreateSession);
        const dataSource = ctx.get<DataSource>(SYMBOLS.DataSource);
        const redis = ctx.get<Redis>(SYMBOLS.Redis);
        const gracefulExit = ctx.get<IGracefulExit>(SYMBOLS.GracefulExit);
        const globalMiddlewares = ctx.get<IGlobalMiddlewares>(
          SYMBOLS.GlobalMiddlewares
        );
        if (!instance)
          instance = new App(
            config,
            logger,
            createSession,
            createServer,
            gracefulExit,
            globalMiddlewares,
            dataSource,
            redis
          );
        return instance;
      };
    });
  }
  static createApp(): () => Promise<App> {
    return () => this.container.getAsync<App>(SYMBOLS.App);
  }
  static createExpress(express?: Application): Promise<App> {
    const provider = this.container.get<AppProvider>("App");
    return provider(express);
  }
}
DI.register();
export { DI };
