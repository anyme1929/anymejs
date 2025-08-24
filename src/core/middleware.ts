import { WELLCOME_HTML } from "../utils/constants";
import session from "express-session";
import RedisStore from "../utils/session-ioredis";
import { encrypt, getEncryptionKey, importModule, isFunction } from "../utils";
import {
  IConfig,
  IMiddleware,
  IRedis,
  Logger,
  Application,
  Ctx,
} from "../types";
import { SSE } from "./sse";
export class Middleware implements IMiddleware {
  private app!: Application;
  private isInitialized: boolean = false;
  constructor(private logger: Logger) {}
  register(app: Application) {
    if (this.isInitialized) return this;
    this.app = app;
    this.isInitialized = true;
    return this;
  }
  async applyRoute() {
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
  async applyLimiter(config: IConfig["limiter"]) {
    if (!this.isInitialized) throw new Error("Middleware not initialized");
    const { enable, rules, rule } = config;
    if (!enable) return;
    const { rateLimit } = await importModule("express-rate-limit");
    const { slowDown } = await importModule("express-slow-down");
    if (rules) {
      Object.entries(rules).forEach(([key, value]) => {
        if (Array.isArray(value))
          this.app.use(key, slowDown(value[0]), rateLimit(value[1]));
        else {
          const { slowDownOptions, rateLimitOptions } = value;
          if (slowDownOptions) this.app.use(key, slowDown(slowDownOptions));
          if (rateLimitOptions) this.app.use(key, rateLimit(rateLimitOptions));
        }
      });
    } else if (rule) {
      const { slowDownOptions, rateLimitOptions } = rule;
      if (slowDownOptions) this.app.use(slowDown(slowDownOptions));
      if (rateLimitOptions) this.app.use(rateLimit(rateLimitOptions));
    }
  }
  async applySession(config: IConfig["session"], redis: IRedis) {
    try {
      const { enable, type, prefix, client } = config;
      if (!enable) return;
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
  async applySSE(config: IConfig["sse"], ctx: Ctx) {
    if (!config.enable) return;
    Object.entries(config.routes!).forEach(([path, opt]) => {
      const sse = new SSE(opt.initial, opt.options);
      this.app.use(path, (req, res) => {
        sse.init(req, res);
        if (isFunction(opt.controller))
          opt.controller({
            request: req,
            response: res,
            sse,
            ...ctx,
          });
      });
    });
  }
}
