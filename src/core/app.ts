import type {
  IConfig,
  IDataSource,
  IRedis,
  IGracefulExit,
  Logger,
  IServer,
  ICreateServer,
  IMiddleware,
  Application,
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
    private dataSource: IDataSource
  ) {
    this.middleware.register(this.app);
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
  private async initialize() {
    try {
      await Promise.all([this.initDatabase(), this.initRedis()]);
      await this.middleware.applyLimiter(this.config.limiter);
      await this.middleware.applySession(this.config.session, this.redis);
      await this.middleware.applySSE(this.config.sse);
      await this.middleware.applyRoute();
    } catch (error) {
      this.logger.error("❌ Failed to initialize", error);
      throw error;
    }
  }
  private async initDatabase() {
    try {
      if (this.config.db.enable === false) return;
      const result = await this.dataSource.connectAll();
      if (result.length > 0)
        this.gracefulExit.addCleanupTask(() => this.dataSource.closeAll());
    } catch (error) {
      this.logger.error("❌ Failed to connect to database", error);
      throw error;
    }
  }
  private async initRedis() {
    try {
      if (!this.config.redis.enable) return;
      const result = await this.redis.connectAll();
      if (result.length > 0)
        this.gracefulExit.addCleanupTask(() => this.redis.closeAll());
    } catch (error) {
      this.logger.error("❌ Failed to init Redis", error);
      throw error;
    }
  }
  use<T extends (...args: any[]) => any>(...handlers: T[]) {
    this.app.use(...handlers);
    return this;
  }
}
