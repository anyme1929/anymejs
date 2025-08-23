import { CONFIG, ENV_KEY_VALUES } from "./default.config";
import { extname, basename, join, resolve } from "node:path";
import fg from "fast-glob";
import { type IConfig } from "../types";
import {
  deepMerge,
  isEmpty,
  set,
  importModule,
  getAbsolutePath,
  ctx,
  isFunction,
} from "../utils";
export class CoreConfig {
  #config: IConfig = CONFIG;
  private fileGroups: Map<string, string> = new Map();
  private configs: Map<string, object> = new Map();
  private path: string = process.env.CONFIG_PATH || "./config";
  private env: string = process.env.NODE_ENV || "development";
  private ignore: string[] = ["**/node_modules/**", "**/dist/**", "**/*.d.ts"];
  private order: string[] = [".ts", ".js", ".mjs", ".cjs", ".json"];
  constructor() {
    this.fileGroups = this.Group(this.loadPaths());
  }
  async get(name?: string) {
    if (!name) return await this.loadCore();
    if (this.configs.has(name)) return this.configs.get(name);
    if (this.fileGroups.has(name)) {
      const module = await this.loadConfig(this.fileGroups.get(name)!);
      this.configs.set(name, module);
      return module;
    }
    return undefined;
  }
  async loadCore() {
    if (this.configs.has("core") || isEmpty(this.fileGroups))
      return this.#config;
    this.fileGroups.forEach(async (path, key) => {
      const module = await this.loadConfig(path);
      if (!isEmpty(module)) this.configs.set(key, module);
    });
    const loadOrder: string[] = [];
    if (this.fileGroups.has("default")) {
      loadOrder.push("default");
      this.configs.set(
        "default",
        await this.loadConfig(this.fileGroups.get("default")!)
      );
    }
    if (this.env === "development" && this.fileGroups.has("local")) {
      loadOrder.push("local");
      this.configs.set(
        "local",
        await this.loadConfig(this.fileGroups.get("local")!)
      );
    } else if (this.env === "production" && this.fileGroups.has("prod")) {
      loadOrder.push("prod");
      this.configs.set(
        "prod",
        await this.loadConfig(this.fileGroups.get("prod")!)
      );
    } else if (
      this.env &&
      this.fileGroups.has(this.env) &&
      !loadOrder.includes(this.env)
    ) {
      loadOrder.push(this.env);
      this.configs.set(
        this.env,
        await this.loadConfig(this.fileGroups.get(this.env)!)
      );
    }
    for (const key of loadOrder) {
      const Path = this.fileGroups.get(key);
      if (Path)
        this.#config = deepMerge(this.#config, await this.loadConfig(Path));
    }
    this.loadEnvConfig();
    this.resolveServerPaths();
    this.validate();
    this.configs.set("core", this.#config);
    return this.#config;
  }
  private loadPaths() {
    return fg.sync(this.getPattern(), {
      onlyFiles: true,
      ignore: this.ignore,
      absolute: true,
    });
  }

  private Group(paths: string[]) {
    const fileGroups = new Map<string, string>();
    for (const path of paths) {
      const ext = extname(path);
      const index = this.order.indexOf(ext);
      if (index === -1) continue;
      const fileName = basename(path, ext).slice(0, -7);
      if (!fileGroups.has(fileName)) fileGroups.set(fileName, path);
      else {
        const oldIndex = this.order.indexOf(extname(fileGroups.get(fileName)!));
        if (index < oldIndex) fileGroups.set(fileName, path);
      }
    }
    return fileGroups;
  }
  private async loadConfig(path: string) {
    try {
      const module = await importModule(path);
      const result = isFunction(module) ? module(ctx()) : module;
      return isEmpty(result) ? {} : result;
    } catch (error) {
      console.error("❌ Failed to load config:", error);
      throw error;
    }
  }
  private async loadEnvConfig() {
    ENV_KEY_VALUES.forEach((item) => {
      if (process.env[item.value]) {
        if (item.type === "number")
          this.merge(item.key, parseInt(process.env[item.value]!));
        else if (item.type === "boolean")
          this.merge(item.key, process.env[item.value] === "true");
        else if (item.type === "resolve")
          this.merge(item.key, resolve(process.env[item.value]!));
        else this.merge(item.key, process.env[item.value]!);
      }
    });
  }
  private getPattern() {
    const ext = this.order.join(",");
    return join(this.path, `*.config{${ext}}`).replace(/\\/g, "/");
  }
  private merge(str: string, value: any) {
    this.#config = deepMerge(this.#config, set(str, value));
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
  private resolveServerPaths() {
    const serverPaths = ["controllers", "middlewares", "interceptors"] as const;
    serverPaths.forEach((key) => {
      if (
        this.#config.server?.route?.[key]?.length === 1 &&
        typeof this.#config.server?.route?.[key][0] === "string"
      ) {
        const path = this.#config.server.route[key][0];
        this.merge(`server.route.${key}`, [getAbsolutePath(path)]);
      }
    });
  }
}
