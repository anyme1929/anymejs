import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import fg from "fast-glob";
import { IConfig, userConfig } from "./types";
import { deepMerge, isEmpty } from "./utils";
export class CoreConfig {
  #path: string = process.env.CONFIG_PATH || "./app.config.{ts,js,json}";
  #config: IConfig = {
    public_path: "public",
    port: parseInt(process.env.PORT || "3000"),
    node_env: process.env.NODE_ENV || "development",
    is_dev: process.env.NODE_ENV === "development",
    api_prefix: process.env.API_PREFIX || "",
    logger: {
      level: "info",
    },
    db: {
      enable: false,
      client: {
        type: "mysql",
        host: process.env.DB_HOST || "localhost",
        port: parseInt(process.env.DB_PORT || "3306"),
        username: process.env.DB_USER || "root",
        password: process.env.DB_PASSWORD || "",
        database: process.env.DB_NAME || "",
        entities: [resolve("src/models/**/*{.ts,.js}")],
        migrations: [resolve("src/migrations/**/*{.ts,.js}")],
        poolSize: parseInt(process.env.DB_POOL_SIZE || "10"),
        synchronize: false, // 生产环境设为false，使用迁移
        logging: process.env.NODE_ENV === "development",
      },
    },
    redis: {
      enable: false,
      client: {
        name: process.env.REDIS_MASTER_NAME || "mymaster",
        password: process.env.REDIS_PASSWORD || "",
        db: parseInt(process.env.REDIS_DB || "0"),
        lazyConnect: true,
        sentinels: [
          {
            host: process.env.REDIS_SENTINEL_HOST || "localhost",
            port: parseInt(process.env.REDIS_SENTINEL_PORT || "26379"),
          },
        ],
      },
    },
    session: {
      enable: true,
      prefix: process.env.SESSION_PREFIX || "session:",
      type: "memory",
      client: {
        secret: process.env.SESSION_SECRET || "session",
        resave: false,
        saveUninitialized: false,
        cookie: {
          secure: process.env.NODE_ENV === "production",
          httpOnly: true,
          maxAge: 1000 * 60 * 60,
        },
      },
    },
    router: {
      cors: {
        origin: process.env.CORS_ORIGIN || "*",
        methods: process.env.CORS_METHODS || "GET,POST,PUT,DELETE,OPTIONS",
        credentials: false,
      },
      routePrefix: process.env.API_PREFIX || "",
      controllers: [resolve("src/controllers/**/*{.ts,.js}")],
      middlewares: [resolve("src/middlewares/**/*{.ts,.js}")],
      interceptors: [resolve("src/interceptors/**/*{.ts,.js}")],
    },
    https: {
      enable: false,
      options: {
        port: parseInt(process.env.HTTPS_PORT || "443"),
        key: resolve(process.env.HTTPS_KEY || "key.pem"),
        cert: resolve(process.env.HTTPS_CERT || "cert.pem"),
      },
    },
  };
  async loadConfig(path?: string): Promise<IConfig> {
    const files = await fg(path || this.#path, {
      onlyFiles: true,
      ignore: ["**/node_modules/**", "**/dist/**"],
      absolute: true,
    });
    if (!isEmpty(files)) await this.setConfig(files[0]);
    return this.#config;
  }
  private async setConfig(path: string) {
    try {
      const config = await this.resolve(path);
      this.#config = deepMerge(this.#config, config);
    } catch (error) {
      console.error(`Error loading config file ${path}:`, error);
      throw error;
    }
  }
  private async resolve(path: string): Promise<userConfig> {
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
  get config() {
    return this.#config;
  }
}
