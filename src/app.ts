import express, { urlencoded } from "express";
import { injectable, inject } from "inversify";
import helmet from "helmet";
import morgan from "morgan";
import {
  type IConfig,
  type DataSource,
  type Redis,
  type Server,
  type Application,
  type ICreateServer,
  type IGracefulExit,
  type ICreateSession,
  type IGlobalMiddlewares,
  type Logger,
  type IHandler,
  type RequestHandler,
  SYMBOLS,
} from "./types";
@injectable("Singleton")
export class App {
  app: Application = express();
  private server: Server | null = null;
  constructor(
    @inject(SYMBOLS.Config) private config: IConfig,
    @inject(SYMBOLS.Logger) private logger: Logger,
    @inject(SYMBOLS.CreateSession) private createSession: ICreateSession,
    @inject(SYMBOLS.CreateServer)
    private serverFactory: (app: Application) => Promise<ICreateServer>,
    @inject(SYMBOLS.GracefulExit) private gracefulExit: IGracefulExit,
    @inject(SYMBOLS.GlobalMiddlewares)
    private globalMiddlewares: IGlobalMiddlewares,
    @inject(SYMBOLS.DataSource) private dataSource?: DataSource,
    @inject(SYMBOLS.Redis) private redis?: Redis
  ) {
    this.globalMiddlewares.init(this.app);
    console.log(dataSource);
  }
  /**
   * 启动 HTTP 服务器，并在服务器成功启动或出错时进行相应处理。
   * 返回一个 Promise，当服务器成功启动时解析为服务器实例，出错时拒绝并抛出错误。
   * @returns {Promise<App.Server>} 一个 Promise，解析为服务器实例。
   */
  async bootstrap(port?: number): Promise<Server> {
    if (this.server) return this.server;
    const { config, logger, dataSource, redis } = this;
    try {
      await this.initialize();
      const server = await this.serverFactory(this.app);
      this.server = await server.bootstrap(port || config.port);
      //注册服务器退出处理逻辑，传入服务器实例、日志记录器、健康检查函数和资源关闭函数
      this.gracefulExit.register(this.server).setHealthCheck({
        "/health": async () => ({
          timestamp: new Date().toISOString(),
          db: dataSource?.isInitialized ? "connected" : "disconnected",
          redis: redis?.status,
        }),
      });
      logger.info(
        `🚀 Server running on http://localhost:${port || config.port}`
      );
      return this.server;
    } catch (error) {
      logger.error("❌ Failed to start server:", error);
      throw error;
    }
  }
  use(...handlers: (IHandler | RequestHandler)[]) {
    this.globalMiddlewares.register(...handlers);
  }
  private async initialize() {
    try {
      await Promise.all([
        this.initDatabase(),
        this.initRedis(),
        this.cinfigGlobalMiddlewares(),
      ]);
      await this.configSession();
    } catch (error) {
      this.logger.error("❌ Failed to initialize", error);
      throw error;
    }
  }
  private async initDatabase() {
    const { config, dataSource, logger, gracefulExit } = this;
    try {
      if (!dataSource || config.db.enable === false || dataSource.isInitialized)
        return;
      await dataSource.initialize();
      logger.info("✅ Database connected");
      gracefulExit.addCleanupTask(async () => {
        await dataSource!.destroy();
        logger.info("✅ Database connection closed");
      });
    } catch (error) {
      logger.error("❌ Failed to connect to database", error);
      throw error;
    }
  }
  private async initRedis() {
    const { config, redis, logger, gracefulExit } = this;
    try {
      if (!redis || config.redis.enable === false) return;
      if (redis.status !== "wait") return;
      await redis.connect();
      logger.info("✅ Redis connected");
      gracefulExit.addCleanupTask(async () => {
        await redis!.quit();
        logger.info("✅ Redis connection closed");
      });
    } catch (error) {
      logger.error("❌ Failed to connect to Redis", error);
      throw error;
    }
  }
  private async configSession() {
    const { createSession, config, logger, globalMiddlewares } = this;
    try {
      const { enable, type, prefix } = config.session;
      if (enable === false) return;
      if (type === "redis") {
        if (!this.redis) throw new Error("Redis is required");
        createSession.setRedis(prefix, this.redis);
      }
      const session = createSession.getHandler();
      globalMiddlewares.register(session);
      logger.info(`✅ Session set with ${type} store`);
    } catch (error) {
      logger.error("❌ Failed to config session:", error);
      throw error;
    }
  }
  private async cinfigGlobalMiddlewares() {
    this.globalMiddlewares.register(
      urlencoded({ extended: true }),
      helmet(),
      morgan("dev")
    );
  }
}
