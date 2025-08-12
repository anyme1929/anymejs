import config from "./default.config";
import { pathToFileURL } from "node:url";
import { extname, basename, join, resolve } from "node:path";
import { readFile } from "node:fs/promises";
import fg from "fast-glob";
import { type IConfig, type UserConfig } from "../types";
import { deepMerge, isEmpty, createNestedObject } from "../utils";
export class CoreConfig {
  #config: IConfig = config;
  private path: string = process.env.CONFIG_PATH || "./config";
  private env: string = process.env.NODE_ENV || "development";
  private ignore: string[] = ["**/node_modules/**", "**/dist/**", "**/*.d.ts"];
  private order: string[] = [".ts", ".js", ".mjs", ".cjs", ".json"];
  private readonly keywords: Record<string, string[]> = {
    development: ["default.config", "local.config"],
    production: ["default.config", "prod.config"],
    test: ["default.config", "test.config"],
  };
  async load(): Promise<IConfig> {
    const files = await this.loadConfigFiles();
    if (!isEmpty(files)) await this.loadConfig(...files);
    await this.loadEnvConfig();
    await this.validate();
    return this.#config;
  }
  private async loadConfigFiles() {
    let files = await fg(this.getPath(), {
      onlyFiles: true,
      ignore: this.ignore,
      absolute: true,
    });
    if (isEmpty(files)) return [];
    const keywords = this.keywords[this.env] || [];
    // 按文件名（不含扩展名）分组
    const fileGroups = new Map<string, string[]>();
    for (const file of files) {
      const fileName = basename(file, extname(file));
      const matched = keywords.find((keyword) => fileName.startsWith(keyword));
      if (matched) {
        if (!fileGroups.has(matched)) fileGroups.set(matched, []);
        fileGroups.get(matched)!.push(file);
      }
    }
    return this.sortFiles(fileGroups, keywords);
  }
  private sortFiles(
    fileGroups: Map<string, string[]>,
    keywords: string[] = []
  ) {
    const result: string[] = [];
    // 按关键词优先级顺序处理
    for (const keyword of keywords) {
      const files = fileGroups.get(keyword);
      if (!files || isEmpty(files)) continue;
      const sortedFiles = [...files].sort((a, b) => {
        const extA = extname(a);
        const extB = extname(b);
        const indexA = this.order.indexOf(extA);
        const indexB = this.order.indexOf(extB);
        if (indexA === -1 && indexB === -1) return 0;
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      });
      result.push(sortedFiles[0]);
    }
    return result;
  }
  private getPath() {
    const ext = this.order.join(",");
    return join(this.path, `*.config{${ext}}`).replace(/\\/g, "/");
  }
  private async loadConfig(...paths: string[]) {
    try {
      const promises = paths.map((path) => this.resolve(path));
      const configs = (await Promise.all(promises)).filter(
        (config) => !isEmpty(config)
      );
      this.#config = deepMerge(this.#config, ...configs);
    } catch (error) {
      throw error;
    }
  }
  private async resolve(path: string): Promise<UserConfig> {
    if (extname(path) === ".json")
      try {
        return JSON.parse(await readFile(path, "utf-8"));
      } catch (error) {
        console.error(`Failed to parse JSON config at ${path}:`, error);
        return {};
      }
    if (typeof require === "undefined") {
      // ESM 环境
      const fileUrl = pathToFileURL(path).toString();
      let mod = await import(fileUrl);
      mod = mod?.default?.__esModule ? mod.default : mod;
      return mod?.default || mod;
    } else {
      // CommonJS 环境
      const mod = require(path);
      return mod?.__esModule && mod.default ? mod.default : mod;
    }
  }
  private async loadEnvConfig() {
    if (process.env.PORT) this.#config.port = parseInt(process.env.PORT);
    if (process.env.API_PREFIX)
      this.merge("api_prefix", process.env.API_PREFIX);
    if (process.env.LOG_LEVEL)
      this.merge("logger.level", process.env.LOG_LEVEL);
    if (this.#config.db.enable) {
      if (process.env.DB_HOST)
        this.merge("db.client.host", process.env.DB_HOST);
      if (process.env.DB_PORT)
        this.merge("db.client.port", parseInt(process.env.DB_PORT));
      if (process.env.DB_USER)
        this.merge("db.client.username", process.env.DB_USER);
      if (process.env.DB_PASSWORD)
        this.merge("db.client.password", process.env.DB_PASSWORD);
      if (process.env.DB_DATABASE)
        this.merge("db.client.database", process.env.DB_DATABASE);
    }
    if (this.#config.redis.enable) {
      if (process.env.REDIS_MASTER_NAME)
        this.merge("redis.client.name", process.env.REDIS_MASTER_NAME);
      if (process.env.REDIS_USERNAME)
        this.merge("redis.client.username", process.env.REDIS_USERNAME);
      if (process.env.REDIS_HOST)
        this.merge("redis.client.host", process.env.REDIS_HOST);
      if (process.env.REDIS_PORT)
        this.merge("redis.client.port", parseInt(process.env.REDIS_PORT));
      if (process.env.REDIS_PASSWORD)
        this.merge("redis.client.password", process.env.REDIS_PASSWORD);
      if (process.env.REDIS_DATABASE)
        this.merge(
          "redis.client.password",
          parseInt(process.env.REDIS_DATABASE)
        );
    }
    if (this.#config.session.enable) {
      if (process.env.SESSION_SECRET)
        this.merge("session.client.secret", process.env.SESSION_SECRET);
      if (process.env.SESSION_PREFIX)
        this.merge("session.client.cookie.secure", process.env.SESSION_PREFIX);
    }
    if (this.#config.https.enable) {
      if (process.env.HTTPS_PORT)
        this.merge("https.options.port", parseInt(process.env.HTTPS_PORT));
      if (process.env.HTTPS_KEY)
        this.merge("https.options.key", resolve(process.env.HTTPS_KEY));
      if (process.env.HTTPS_CERT)
        this.merge("https.options.cert", resolve(process.env.HTTPS_CERT));
    }
  }
  private merge(str: string, value: any) {
    this.#config = deepMerge(this.#config, createNestedObject(str, value));
  }
  private async validate() {
    // 验证必要配置项
    if (!this.#config.session?.client?.secret) {
      console.warn("⚠️ Session secret is not set.");
    }
    // 生产环境强制设置
    if (this.env === "production") {
      if (this.#config.session?.enable) {
        if (!this.#config.session?.client?.cookie?.secure) {
          console.warn("⚠️ Forcing secure cookies in production environment");
        }
      }
      if (this.#config.db?.enable) {
        if (this.#config.db?.client?.synchronize) {
          console.warn(
            "⚠️ Database synchronization is enabled in production environment"
          );
        }
      }
    }
  }
}
