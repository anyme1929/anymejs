import type {
  IConfig,
  IDataSource,
  IRedis,
  ICache,
  IGracefulExit,
  Logger,
  IServer,
  ICreateServer,
  ICoreConfig,
  IMiddleware,
  Application,
  Ctx,
} from "../types";
import { importModule } from "../utils";
export class Anyme {
  private server: IServer | null = null;
  constructor(
    private app: Application,
    private config: ICoreConfig,
    private logger: Logger,
    private createServer: ICreateServer,
    private gracefulExit: IGracefulExit,
    private middleware: IMiddleware,
    private redis: IRedis,
    private cache: ICache,
    private dataSource: IDataSource
  ) {
    this.middleware.register(this.app);
  }
  async bootstrap(port?: number): Promise<IServer> {
    if (this.server) return this.server;
    try {
      await this.initialize();
      const config = await this.config.get();
      this.server = await this.createServer
        .init(this.app, config.server)
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
  use<T extends (...args: any[]) => any>(...handlers: T[]) {
    this.app.use(...handlers);
    return this;
  }
  private getCtx(): Ctx {
    return {
      cache: this.cache,
      logger: this.logger,
      redis: this.redis.get(),
      dataSource: this.dataSource.get(),
    };
  }
  private async initialize() {
    try {
      const config = await this.config.get();
      await Promise.all([this.initDatabase(), this.initRedis()]);
      await this.middleware.applyLimiter(config.limiter);
      await this.middleware.applySession(config.session, this.redis);
      await this.middleware.applySSE(config.sse, this.getCtx());
      await this.middleware.applyRoute();
    } catch (error) {
      this.logger.error("❌ Failed to initialize", error);
      throw error;
    }
  }
  private async initDatabase() {
    try {
      const { db } = await this.config.get();
      if (db.enable === false) return;
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
      const { redis } = await this.config.get();
      if (!redis.enable) return;
      const result = await this.redis.connectAll();
      if (result.length > 0)
        this.gracefulExit.addCleanupTask(() => this.redis.closeAll());
    } catch (error) {
      this.logger.error("❌ Failed to init Redis", error);
      throw error;
    }
  }
}
