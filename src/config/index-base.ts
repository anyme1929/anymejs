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
  private configs: Map<string, object> = new Map();
  private path: string = process.env.CONFIG_PATH || "./config";
  private env: string = process.env.NODE_ENV || "development";
  private ignore: string[] = ["**/node_modules/**", "**/dist/**", "**/*.d.ts"];
  private order: string[] = [".ts", ".js", ".mjs", ".cjs", ".json"];
  private readonly keywords: Record<string, string[]> = {
    development: ["default.config", "local.config"],
    production: ["default.config", "prod.config"],
    test: ["default.config", "test.config"],
  };
  async load(name?: string) {
    return name
      ? await this.loadConfig(...(await this.loadPaths(name)))
      : await this.loadCoreConfig();
  }
  private async loadCoreConfig() {
    if (this.configs.has("core")) return this.configs.get("core");
    let files = await this.loadPaths();
    files = this.filterCore(files);
    if (!isEmpty(files))
      this.#config = deepMerge(
        this.#config,
        ...(await this.loadConfig(...files))
      );
    await this.loadEnvConfig();
    await this.validate();
    this.configs.set("core", this.#config);
    return this.#config;
  }
  private async loadPaths(name?: string) {
    return await fg(this.getPattern(name), {
      onlyFiles: true,
      ignore: this.ignore,
      absolute: true,
    });
  }
  private filterCore(files: string[]) {
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
  private async loadConfig(...paths: string[]) {
    try {
      return (
        await Promise.all(
          paths.map(async (path) => {
            const module = await importModule(path);
            const result = isFunction(module) ? module(ctx()) : module;
            return isEmpty(result) ? null : result;
          })
        )
      ).filter(Boolean);
    } catch (error) {
      console.error("❌ Failed to load config:", error);
      throw error;
    }
  }
  private async loadEnvConfig() {
    ENV_KEY_VALUES.forEach((item) => {
      if (process.env[item.value]) {
        if (item.type === "number")
          this.set(item.key, parseInt(process.env[item.value]!));
        else if (item.type === "boolean")
          this.set(item.key, process.env[item.value] === "true");
        else if (item.type === "resolve")
          this.set(item.key, resolve(process.env[item.value]!));
        else this.set(item.key, process.env[item.value]!);
      }
    });
  }
  private getPattern(name?: string) {
    const ext = this.order.join(",");
    return join(this.path, `${name ?? "*"}.config{${ext}}`).replace(/\\/g, "/");
  }
  private set(str: string, value: any) {
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
    this.resolveServerPaths();
  }
  private resolveServerPaths() {
    const serverPaths = ["controllers", "middlewares", "interceptors"] as const;
    serverPaths.forEach((key) => {
      if (
        this.#config.server?.route?.[key]?.length === 1 &&
        typeof this.#config.server?.route?.[key][0] === "string"
      ) {
        const path = this.#config.server.route[key][0];
        this.set(`server.route.${key}`, [getAbsolutePath(path)]);
      }
    });
  }
}
