import type {
  IConfig,
  DataSource,
  Redis,
  IGracefulExit,
  Logger,
  IServer,
  ICreateServer,
  ICreateSession,
  IRouteRegistrar,
  Application,
} from "../types";
export class Anyme {
  private server: IServer | null = null;
  constructor(
    private app: Application,
    private config: IConfig,
    private logger: Logger,
    private createServer: ICreateServer,
    private createSession: ICreateSession,
    private gracefulExit: IGracefulExit,
    private routeRegistrar: IRouteRegistrar,
    private dataSource?: DataSource,
    private redis?: Redis
  ) {}
  async bootstrap(port?: number): Promise<IServer> {
    if (this.server) return this.server;
    const { dataSource, redis } = this;
    try {
      await this.initialize();
      this.server = await this.createServer
        .init(this.app, this.config.server)
        .bootstrap(port || this.config.port, this.config.https);
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
      this.logger.error("❌ Failed to start server:", error);
      throw error;
    }
  }
  protected async initialize() {
    try {
      await Promise.all([this.initDatabase(), this.initRedis()]);
      this.configSession();
      this.routeRegistrar.register(this.app);
    } catch (error) {
      this.logger.error("❌ Failed to initialize", error);
      throw error;
    }
  }
  private async initDatabase() {
    try {
      if (
        !this.dataSource ||
        this.config.db.enable === false ||
        this.dataSource.isInitialized
      )
        return;
      await this.dataSource.initialize();
      this.logger.info("✅ Database connected");
      this.gracefulExit.addCleanupTask(async () => {
        await this.dataSource!.destroy();
        this.logger.info("✅ Database connection closed");
      });
    } catch (error) {
      this.logger.error("❌ Failed to connect to database", error);
      throw error;
    }
  }
  private async initRedis() {
    try {
      if (!this.redis || this.config.redis.enable === false) return;
      if (this.redis.status !== "wait") return;
      await this.redis.connect();
      this.logger.info("✅ Redis connected");
      this.gracefulExit.addCleanupTask(async () => {
        this.redis!.removeAllListeners();
        await this.redis!.quit();
        this.logger.info("✅ Redis connection closed");
      });
    } catch (error) {
      this.logger.error("❌ Failed to connect to Redis", error);
      throw error;
    }
  }

  private configSession() {
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
