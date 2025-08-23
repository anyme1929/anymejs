import { Redis, Cluster } from "ioredis";
import type {
  IConfig,
  Logger,
  RedisOpt,
  IRedis,
  RedisClusterOpt,
} from "../types";
import { isEmpty, deepMerge, all } from "../utils";
export class ARedis implements IRedis {
  private redisMap: Map<string, Redis | Cluster> = new Map();
  constructor(config: IConfig["redis"], private logger: Logger) {
    this.init(config);
  }
  private init(config: IConfig["redis"]) {
    if (!config.enable || this.redisMap.size !== 0) return;
    if (!isEmpty(config.client)) this.set("default", config.client!);
    if (!isEmpty(config.clients))
      Object.entries(config.clients!).forEach(([key, opt]) => {
        if ("default" in config && !isEmpty(config.default))
          opt = deepMerge(config.default!, opt);
        this.set(key, opt);
      });
  }
  private createClient(opt: RedisOpt) {
    const defaultClient = this.redisMap.get("default");
    const isClusterOpt = this.isClusterOpt(opt);
    try {
      if (!defaultClient)
        return isClusterOpt
          ? new Cluster(opt.node, opt.options)
          : new Redis(opt);
      const isRedisClient = this.isRedis(defaultClient);
      if (!isClusterOpt)
        return isRedisClient ? defaultClient.duplicate(opt) : new Redis(opt);
      return !isRedisClient
        ? defaultClient.duplicate(opt.node, opt.options)
        : new Cluster(opt.node, opt.options);
    } catch (error) {
      this.logger.error("❌ Failed to create redis client:", error);
      return undefined;
    }
  }
  private set(key: string, opt: RedisOpt) {
    const client = this.createClient(opt);
    if (client) this.redisMap.set(key, client);
  }
  private isRedis(client: Redis | Cluster): client is Redis {
    return client instanceof Redis;
  }
  private isClusterOpt(opt: RedisOpt): opt is RedisClusterOpt {
    return "cluster" in opt && opt.cluster === true;
  }
  async connectAll() {
    if (this.redisMap.size === 0) return [];
    return await all(this.redisMap, async ([key, client]) => {
      if (client.status === "wait") await this.connectClient(client, key);
      return client.status;
    });
  }
  private async connectClient(
    client: Redis | Cluster,
    key: string
  ): Promise<void> {
    try {
      await client.connect();
      this.logger.info(`✅ Redis client "${key}" connected successfully`);
    } catch (error) {
      this.logger.error(`❌ Failed to connect Redis client "${key}":`, error);
      throw error;
    }
  }
  async close(name?: string) {
    const client = this.redisMap.get(name ?? "default");
    if (!client) return;
    client.removeAllListeners();
    await client.quit();
    this.redisMap.delete(name ?? "default");
    this.logger.debug(`✅ Redis connection closed: ${name}`);
  }
  get(name?: string) {
    const client = this.redisMap.get(name ?? "default");
    if (client) return client;
    else throw new Error(`Redis client "${name ?? "default"}" not found`);
  }
  getAll() {
    return new Map(this.redisMap);
  }
  async closeAll() {
    if (this.redisMap.size === 0) return;
    await all(
      this.redisMap,
      ([key, client]) =>
        client
          .removeAllListeners()
          .quit()
          .finally(() => this.redisMap.delete(key)),
      this
    );
    this.logger.info("✅ All Redis connections closed");
  }
}
