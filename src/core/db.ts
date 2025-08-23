import { DataSource, type DataSourceOptions } from "typeorm";
import { IConfig, Logger, IDataSource } from "../types";
import { deepMerge, isEmpty, all } from "../utils";
export class ADataSource implements IDataSource {
  private dataSourceMap: Map<string, DataSource> = new Map();
  constructor(private logger: Logger, config: IConfig["db"]) {
    this.init(config);
  }
  init(config: IConfig["db"]) {
    if (!config.enable || this.dataSourceMap.size !== 0) return;
    if (!isEmpty(config.client)) this.set("default", config.client!);
    if (!isEmpty(config.clients)) {
      Object.entries(config.clients!).forEach(([key, opt]) => {
        if ("default" in config && !isEmpty(config.default))
          opt = deepMerge(config.default!, opt);
        this.set(key, opt);
      });
    }
  }
  private set(key: string, opt: DataSourceOptions) {
    const client = this.createClient(opt);
    if (client) this.dataSourceMap.set(key, client);
  }
  private createClient(opt: DataSourceOptions) {
    try {
      return new DataSource(opt);
    } catch (error) {
      this.logger.error("❌ Failed to create db client:", error);
      return undefined;
    }
  }
  async connectAll() {
    if (this.dataSourceMap.size === 0) return [];
    return all(this.dataSourceMap, ([key, client]) =>
      this.connectClient(client, key)
    );
  }
  private async connectClient(client: DataSource, key: string): Promise<void> {
    try {
      await client.initialize();
      this.logger.info(`✅ Database client "${key}" initialized successfully`);
    } catch (error) {
      this.logger.error(
        `❌ Failed to initialize Database client "${key}":`,
        error
      );
      throw error;
    }
  }
  get(name?: string) {
    const client = this.dataSourceMap.get(name ?? "default");
    if (client) return client;
    else throw new Error(`Database client "${name ?? "default"}" not found`);
  }
  getAll() {
    return new Map(this.dataSourceMap);
  }
  async close(name?: string) {
    const client = this.dataSourceMap.get(name ?? "default");
    if (!client) return;
    await client.destroy();
    this.dataSourceMap.delete(name ?? "default");
    this.logger.debug(`✅ Database connection closed: ${name}`);
  }
  async closeAll() {
    if (this.dataSourceMap.size === 0) return;
    const closePromises: Promise<void>[] = [];
    this.dataSourceMap.forEach((client, key) => {
      closePromises.push(
        new Promise((resolve) => {
          client.destroy().finally(() => {
            this.dataSourceMap.delete(key);
            resolve();
          });
        })
      );
    });
    await Promise.all(closePromises);
    this.logger.info("✅ All database connections closed");
  }
}
