import type {
  IConfig,
  DataSource,
  IRedis,
  IGracefulExit,
  Logger,
  IServer,
  ICache,
  ICreateServer,
  IMiddleware,
  Application,
  RequestHandler,
} from "../types";
export class Anyme {
  private server: IServer | null = null;
  constructor(
    private app: Application,
    private config: IConfig,
    private logger: Logger,
    private createServer: ICreateServer,
    private gracefulExit: IGracefulExit,
    private middleware: IMiddleware,
    private redis: IRedis,
    private cache: ICache,
    private dataSource?: DataSource
  ) {
    this.middleware.register(this.app).bind((req) => {
      req.cache = this.cache;
    });
  }
  async bootstrap(port?: number): Promise<IServer> {
    if (this.server) return this.server;
    try {
      await this.initialize();
      this.server = await this.createServer
        .init(this.app, this.config.server)
        .bootstrap(port);
      this.gracefulExit.register(this.server, {
        healthCheck: {
          "/health": async () => ({
            timestamp: new Date().toLocaleString(),
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
      this.middleware.applySession(this.config.session, this.redis);
      this.middleware.applyLimiter(this.config.limiter);
      this.middleware.applyRoute();
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
      if (!this.config.redis.enable) return;
      const result = await this.redis.connectAll();
      this.middleware.bind((req) => {
        if (this.config.redis.clients) req.redis = this.redis;
        else req.redis = this.redis.get()!;
      });
      if (result.length > 0)
        this.gracefulExit.addCleanupTask(() => this.redis.closeAll());
    } catch (error) {
      this.logger.error("❌ Failed to init Redis", error);
      throw error;
    }
  }
  use(...handlers: RequestHandler[]) {
    return this.app.use(...handlers);
  }
}
