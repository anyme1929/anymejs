import config from "./default.config";
import { pathToFileURL } from "node:url";
import { extname, basename, join } from "node:path";
import fg from "fast-glob";
import { type IConfig, type userConfig, CONFIG_PATH } from "../types";
import { deepMerge, isEmpty } from "../utils";
export class CoreConfig {
  #path: string = process.env.CONFIG_PATH || CONFIG_PATH;
  #config: IConfig = config;
  private isDev: boolean = process.env.NODE_ENV === "development";
  private ignore: string[] = ["**/node_modules/**", "**/dist/**", "**/*.d.ts"];
  private order: string[] = [".ts", ".js", ".mjs", ".cjs", ".json"];
  private keywords: string[] = ["local", "prod", "default", "test"];
  async load(): Promise<IConfig> {
    this.loadConfigFiles();
    // if (!isEmpty(files)) await this.set(files[0].path);
    return this.#config;
  }
  private async loadConfigFiles() {
    const files = await fg(this.getPath(), {
      onlyFiles: true,
      ignore: this.ignore,
      absolute: true,
    });
    // 按文件名（不含扩展名）分组
    const fileGroups = new Map<string, string[]>();
    for (const file of files) {
      const ext = extname(file);
      const fileName = basename(file, ext);
      if (this.checkKeywords(fileName)) {
        if (!fileGroups.has(fileName)) fileGroups.set(fileName, []);
        fileGroups.get(fileName)!.push(file);
      }
    }

    const order = this.sortByExt(fileGroups);
    console.log(order);
  }
  private checkKeywords(str: string): boolean {
    return this.keywords.some((keyword) => str.includes(keyword));
  }
  private sortByExt(fileGroups: Map<string, string[]>) {
    const selectedFiles: string[] = [];
    for (const [fileName, filePaths] of fileGroups) {
      const sortedFiles = filePaths.sort((a, b) => {
        const extA = extname(a);
        const extB = extname(b);
        const indexA = this.order.indexOf(extA);
        const indexB = this.order.indexOf(extB);
        // 如果扩展名都在优先级列表中，按优先级排序
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        // 如果某个扩展名不在优先级列表中，将其排在后面
        if (indexA === -1 && indexB !== -1) return 1;
        if (indexA !== -1 && indexB === -1) return -1;
        // 如果都不在优先级列表中，保持原有顺序
        return 0;
      });
      if (!isEmpty(sortedFiles[0])) selectedFiles.push(sortedFiles[0]);
    }
    return selectedFiles;
  }
  private getPath() {
    const ext = this.order.join(",");
    return join(this.#path, `*.config{${ext}}`).replace(/\\/g, "/");
  }

  private async set(path: string) {
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
  private validate(): void {
    // 验证必要配置项
    if (!this.#config.session?.client?.secret) {
      console.warn("⚠️ Session secret is not set. Using fallback value");
      this.#config.session = this.#config.session || {};
      this.#config.session.client = this.#config.session.client || {};
      this.#config.session.client.secret = "default-secret";
    }

    // 开发环境特定检查
    if (process.env.NODE_ENV === "development") {
      if (this.#config.db?.client?.synchronize) {
        console.warn(
          "⚠️ Database synchronization is enabled in development mode"
        );
      }
    }

    // 生产环境强制设置
    if (this.#config.node_env === "production") {
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
