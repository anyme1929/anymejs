import { WELLCOME_HTML } from "../utils/constants";
import session from "express-session";
import RedisStore from "../utils/session-ioredis";
import { encrypt, getEncryptionKey } from "../utils";
import {
  Application,
  IConfig,
  IMiddleware,
  IRedis,
  Cluster,
  Logger,
} from "../types";
import { rateLimit } from "express-rate-limit";
import { slowDown } from "express-slow-down";
export default class Middleware implements IMiddleware {
  private app!: Application;
  private isInitialized: boolean = false;
  constructor(private logger: Logger) {}
  register(app: Application) {
    if (this.isInitialized) return this;
    this.app = app;
    this.isInitialized = true;
    return this;
  }
  applyRoute() {
    if (!this.isInitialized) throw new Error("Middleware not initialized");
    this.app
      .get("/", (_, res) => {
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.send(WELLCOME_HTML);
      })
      .get("/encrypt/:text", (req, res) =>
        res.send(encrypt(req.params.text, getEncryptionKey()))
      );
  }
  applyLimiter(config: IConfig["limiter"]) {
    if (!this.isInitialized) throw new Error("Middleware not initialized");
    const { enable, rules } = config;
    if (!enable || !rules) return;
    if (Array.isArray(rules)) {
      rules.forEach((obj) => {
        const [key, value] = Object.entries(obj)[0];
        if (Array.isArray(value))
          this.app.use(key, slowDown(value[0]), rateLimit(value[1]));
        else {
          const { slowDownOptions, rateLimitOptions } = value;
          if (slowDownOptions) this.app.use(key, slowDown(slowDownOptions));
          if (rateLimitOptions) this.app.use(key, rateLimit(rateLimitOptions));
        }
      });
    } else {
      const { slowDownOptions, rateLimitOptions } = rules;
      if (slowDownOptions) this.app.use(slowDown(slowDownOptions));
      if (rateLimitOptions) this.app.use(rateLimit(rateLimitOptions));
    }
  }
  applySession(config: IConfig["session"], redis: IRedis) {
    try {
      const { enable, type, prefix, client } = config;
      if (enable === false) return;
      if (type === "redis") {
        const redisClient = redis?.get(config.redis);
        if (!redisClient) throw new Error("Redis is required");
        client.store = new RedisStore({
          client: redisClient,
          prefix,
        });
      }
      this.app.use(session(client));
      this.logger.info(`✅ Session set with ${type} store`);
    } catch (error) {
      this.logger.error("❌ Failed to config session:", error);
      throw error;
    }
  }
  bind(value: (arg: any) => void) {
    this.app.use((req, _, next) => {
      value(req);
      next();
    });
    return this;
  }
}
