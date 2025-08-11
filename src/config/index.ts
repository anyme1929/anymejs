import config from "./default.config";
import { pathToFileURL } from "node:url";
import { extname, basename, join } from "node:path";
import { readFileSync } from "node:fs";
import fg from "fast-glob";
import { type IConfig, type userConfig } from "../types";
import { deepMerge, isEmpty } from "../utils";
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
    if (!isEmpty(files)) await this.setConfig(...files);
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
    return this.sortByPriority(fileGroups, keywords);
  }
  private sortByPriority(
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
  private async setConfig(...paths: string[]) {
    try {
      let configs: userConfig[] = [];
      for (const path of paths) {
        const config = await this.resolve(path);
        if (!isEmpty(config)) configs.push(config);
      }
      this.#config = deepMerge(this.#config, ...configs);
    } catch (error) {
      throw error;
    }
  }
  private async resolve(path: string): Promise<userConfig> {
    if (extname(path) === ".json")
      try {
        return JSON.parse(readFileSync(path, "utf-8"));
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
  private validate(): void {
    // 验证必要配置项
    if (!this.#config.session?.client?.secret) {
      console.warn("⚠️ Session secret is not set. Using fallback value");
    }

    // 开发环境特定检查
    if (this.env === "development") {
      if (this.#config.db?.client?.synchronize) {
        console.warn(
          "⚠️ Database synchronization is enabled in development mode"
        );
      }
    }

    // 生产环境强制设置
    if (this.env === "production") {
      if (this.#config.session?.client?.cookie?.secure !== true) {
        console.warn("⚠️ Forcing secure cookies in production environment");
        this.#config.session!.client!.cookie!.secure = true;
      }
    }
  }
  get config() {
    return this.#config;
  }
}
