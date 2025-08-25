import { CONFIG, ENV_KEY_VALUES } from "./default.config";
import { extname, basename, join, resolve } from "node:path";
import fg from "fast-glob";
import type { UserConfig, IConfig } from "../types";
import {
  deepMerge,
  isEmpty,
  set,
  importModule,
  importJson,
  getAbsolutePath,
  ctx,
  isFunction,
  all,
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
    this.fileGroups = this.groupConfigs(this.loadPaths());
  }
  async get(name?: string) {
    if (!name) return await this.loadCore();
    if (this.configs.has(name)) return this.configs.get(name)!;
    if (this.fileGroups.has(name)) {
      const module = await this.importConfig(this.fileGroups.get(name)!);
      if (!isEmpty(module)) {
        this.configs.set(name, module);
        return module;
      }
    }
    return undefined;
  }
  async loadCore() {
    if (this.configs.has("core") || isEmpty(this.fileGroups))
      return this.#config;
    await this.loadAllConfigs();
    this.#config = deepMerge(this.#config, ...this.getCoreConfigs()) as IConfig;
    this.loadEnvConfig();
    this.resolveServerPaths();
    this.validate();
    this.configs.set("core", this.#config);
    return this.#config;
  }
  private getCoreConfigs() {
    const configs: UserConfig[] = [];
    if (this.configs.has("default")) {
      configs.push(this.configs.get("default")!);
    }
    if (this.env === "development" && this.configs.has("local")) {
      configs.push(this.configs.get("local")!);
    } else if (this.env === "production" && this.configs.has("prod")) {
      configs.push(this.configs.get("prod")!);
    } else if (this.env && this.configs.has(this.env)) {
      configs.push(this.configs.get(this.env)!);
    }
    return configs;
  }
  private loadAllConfigs() {
    return all(this.fileGroups, async ([key, path]) => {
      const module = await this.importConfig(path);
      if (!isEmpty(module)) this.configs.set(key, module);
      return module;
    });
  }
  private loadPaths() {
    return fg.sync(this.getPattern(), {
      onlyFiles: true,
      ignore: this.ignore,
      absolute: true,
    });
  }

  private groupConfigs(paths: string[]) {
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
  private async importConfig(path: string) {
    try {
      if (extname(path) === ".json") return importJson(path);
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
    this.#config = deepMerge(this.#config, set(str, value)) as IConfig;
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
