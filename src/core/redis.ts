import { Redis, Cluster, type RedisOptions } from "ioredis";
import { IConfig, Logger, RedisClusterOpt, IRedis } from "../types";
import { isEmpty } from "../utils";
export default class ARedis implements IRedis {
  private redisMap: Map<string, Redis | Cluster> = new Map();
  constructor(config: IConfig["redis"], private logger: Logger) {
    this.init(config);
  }
  private init(config: IConfig["redis"]) {
    if (!config.enable) return;
    if (this.redisMap.size !== 0) return this.redisMap;
    const { default: defaultOpt, clients, cluster } = config;
    if (!isEmpty(defaultOpt))
      this.redisMap.set("default", new Redis(defaultOpt));
    if (cluster.enable && !isEmpty(cluster))
      this.redisMap.set("cluster", new Cluster(cluster.node, cluster.options));
    if (clients && !isEmpty(clients))
      Object.entries(clients).forEach(([key, opt]) => {
        if (opt.cluster) {
          const clusterClient = this.redisMap.get("cluster");
          if (clusterClient) {
            this.redisMap.set(
              key,
              (clusterClient as Cluster).duplicate(
                (opt as RedisClusterOpt).node,
                (opt as RedisClusterOpt).options
              )
            );
          } else
            this.redisMap.set(
              key,
              new Cluster(
                (opt as RedisClusterOpt).node,
                (opt as RedisClusterOpt).options
              )
            );
        } else {
          const defaultClient = this.redisMap.get("default");
          if (defaultClient) {
            this.redisMap.set(
              key,
              (defaultClient as Redis).duplicate(opt as RedisOptions)
            );
          } else this.redisMap.set(key, new Redis(opt as RedisOptions));
        }
      });
  }
  async connectAll() {
    if (isEmpty(this.redisMap)) return [];
    const connectPromises: Promise<void>[] = [];
    this.redisMap.forEach((client, key) => {
      if (client.status === "wait")
        connectPromises.push(this.connectClient(client, key));
      else
        this.logger.debug(
          `Redis client "${key}" is already in status: ${client.status}`
        );
    });
    return await Promise.all(connectPromises);
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
  }
  get(name?: string) {
    return this.redisMap.get(name ?? "default");
  }
  getAll() {
    return this.redisMap;
  }
  async closeAll() {
    if (isEmpty(this.redisMap)) return;
    const closePromises: Promise<void>[] = [];
    this.redisMap.forEach((client, key) => {
      closePromises.push(
        new Promise((resolve) => {
          client.removeAllListeners();
          client.quit().finally(() => {
            this.redisMap.delete(key);
            resolve();
          });
        })
      );
    });
    await Promise.all(closePromises);
    this.logger.info("✅ All Redis connections closed");
  }
}
