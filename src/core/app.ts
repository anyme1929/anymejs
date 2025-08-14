import type {
  IConfig,
  DataSource,
  Redis,
  IServer,
  Application,
  ICreateServer,
  IGracefulExit,
  ICreateSession,
  Logger,
} from "../types";
export class App {
  private server: IServer | null = null;
  constructor(
    private readonly app: Application,
    private config: IConfig,
    private logger: Logger,
    private createSession: ICreateSession,
    private createServer: ICreateServer,
    private gracefulExit: IGracefulExit,
    private dataSource?: DataSource,
    private redis?: Redis
  ) {}
  /**
   * 启动 HTTP 服务器，并在服务器成功启动或出错时进行相应处理。
   * 返回一个 Promise，当服务器成功启动时解析为服务器实例，出错时拒绝并抛出错误。
   * @returns {Promise<IServer>} 一个 Promise，解析为服务器实例。
   */
  async bootstrap(port?: number): Promise<IServer> {
    if (this.server) return this.server;
    const { config, logger, dataSource, redis } = this;
    try {
      await this.initialize();
      this.server = await this.createServer
        .init(this.app, this.config.server)
        .bootstrap(port || config.port, this.config.https);
      this.gracefulExit.register(this.server, {
        healthCheck: {
          "/health": async () => ({
            timestamp: new Date().toLocaleString(),
            db: dataSource?.isInitialized ? "connected" : "disconnected",
            redis: redis?.status ? "connected" : "disconnected",
          }),
        },
      });
      return this.server;
    } catch (error) {
      logger.error("❌ Failed to start server:", error);
      throw error;
    }
  }
  private async initialize() {
    try {
      await Promise.all([this.initDatabase(), this.initRedis()]);
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
        redis!.removeAllListeners();
        await redis!.quit();
        logger.info("✅ Redis connection closed");
      });
    } catch (error) {
      logger.error("❌ Failed to connect to Redis", error);
      throw error;
    }
  }
  private async configSession() {
    try {
      const { enable, type, prefix } = this.config.session;
      if (enable === false) return;
      if (type === "redis") {
        if (!this.redis) throw new Error("Redis is required");
        this.createSession.setRedis(prefix, this.redis);
      }
      this.app.use(this.createSession.getHandler());
      this.logger.info(`✅ Session set with ${type} store`);
    } catch (error) {
      this.logger.error("❌ Failed to config session:", error);
      throw error;
    }
  }
}
