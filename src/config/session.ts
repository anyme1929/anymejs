import session from "express-session";
import RedisStore from "../utils/session-ioredis";
import type {
  Redis,
  RequestHandler,
  ICreateSession,
  SessionOptions,
} from "../types";
export default class CreateSession implements ICreateSession {
  private handler: RequestHandler | null = null;
  private config: SessionOptions = {
    secret: "session",
    resave: false,
    saveUninitialized: false,
  };
  constructor(config: SessionOptions) {
    this.config = Object.assign({}, this.config, config);
  }
  setRedis(prefix: string, redis: Redis) {
    if (!redis) throw new Error("Redis instance is required");
    this.config.store = this.createRedisStore(prefix, redis);
  }
  /**
   * 创建会话存储
   */
  private createRedisStore(prefix: string, redis: Redis) {
    return new RedisStore({
      client: redis,
      prefix,
    });
  }
  getHandler(): RequestHandler {
    this.handler ??= session(this.config);
    return this.handler;
  }
}
