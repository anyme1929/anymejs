import { existsSync, readFileSync } from "node:fs";
import { join, isAbsolute } from "node:path";
import type { DeepPartial, userConfig, LoadEnvOptions } from "../types";
export function isObject(obj: unknown): obj is Record<string, unknown> {
  return (
    typeof obj === "object" &&
    obj !== null &&
    !Array.isArray(obj) &&
    Object.prototype.toString.call(obj) === "[object Object]"
  );
}
export function deepMerge<T extends Record<string, any>>(
  target: T,
  ...sources: DeepPartial<T>[]
): T {
  if (!sources.length) return target;
  const result = { ...target };
  for (const source of sources) {
    for (const key in source) {
      if (isObject(source[key]) && key in target)
        result[key] = deepMerge(target[key], source[key]);
      else result[key] = source[key] as any;
    }
  }
  return result;
}
export function isEmpty<T>(value: T) {
  if (!value) return true;
  // 处理字符串/数组/类数组（如 arguments）
  if (
    typeof value === "string" ||
    Array.isArray(value) ||
    (typeof value === "object" &&
      "length" in value &&
      typeof value.length === "number")
  ) {
    return value.length === 0;
  }
  // 处理 Map/Set
  if (value instanceof Map || value instanceof Set) {
    return value.size === 0;
  }
  // 处理对象（排除 null 和上述特殊对象）
  if (Object.prototype.toString.call(value) === "[object Object]") {
    // 检查对象自身可枚举属性的数量
    return Object.keys(value).length === 0;
  }
  // 其他类型（如数字、布尔值等）视为非空
  return false;
}
export function defineConfig(config: userConfig): userConfig {
  return config;
}
// 专用文件加载函数
function loadSingleEnv(path: string, override: boolean) {
  const envContent = readFileSync(path, "utf8");
  for (const line of envContent.split(/\r?\n/)) {
    // 跳过空行和注释
    if (!line.trim() || line.trim().startsWith("#")) continue;

    // 高效分割键值
    const sepIndex = line.indexOf("=");
    if (sepIndex === -1) continue;

    const key = line.slice(0, sepIndex).trim();
    if (!key) continue;

    // 处理值（包括引号）
    let value = line.slice(sepIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    // 根据覆盖规则设置环境变量
    if (override || !(key in process.env)) {
      process.env[key] = value;
    }
  }
}
export function loadEnv(path?: string | string[], options?: LoadEnvOptions) {
  const paths = Array.isArray(path) ? path : [path || ".env"];
  const cwd = options?.cwd || process.cwd();
  const override = options?.override || false;
  for (const p of paths) {
    // 解析绝对路径
    const absolutePath = isAbsolute(p) ? p : join(cwd, p);
    if (!existsSync(absolutePath)) continue;
    try {
      if (override) loadSingleEnv(absolutePath, true);
      else {
        if (typeof process?.loadEnvFile === "function")
          process.loadEnvFile(absolutePath);
        else loadSingleEnv(absolutePath, false);
      }
    } catch (error) {
      console.error(`[loadEnv] ${absolutePath}: ${(error as Error).message}`);
    }
  }
}
