import { existsSync, readFileSync } from "node:fs";
import { resolve, isAbsolute, sep } from "node:path";
import { pathToFileURL } from "node:url";
import {
  randomBytes,
  createCipheriv,
  createDecipheriv,
  createHash,
} from "node:crypto";
import type {
  DeepPartial,
  UserConfig,
  ConfigOptions,
  PackageJson,
  CtxArgs,
} from "../types";
import { ENC_DEFAULT_KEY, IV_LENGTH } from "./constants";
export function merge<T extends Record<string, any>>(
  target: T,
  source: DeepPartial<T>
) {
  if (!isObject(source)) return target as T;
  if (!isObject(target)) return source as T;
  const result = { ...target } as Record<string, any>;
  [...Object.keys(source)].forEach((key) => {
    if (isObject(target[key]) && isObject(source[key])) {
      result[key] = merge(target[key], source[key]);
    } else result[key] = source[key];
  });
  return result as T;
}
export function deepMerge<T extends Record<string, any>>(
  target: T,
  ...sources: DeepPartial<T>[]
): T {
  // 处理空源数组情况
  if (sources.length === 0) return { ...target };
  // 累计合并所有源对象
  return [...sources].reduce(
    (acc, source) => {
      if (isEmpty(source)) return acc;
      return merge(acc, source);
    },
    { ...target }
  );
}
export function isObject(obj: unknown): obj is Record<string, unknown> {
  return (
    typeof obj === "object" &&
    obj !== null &&
    !Array.isArray(obj) &&
    Object.prototype.toString.call(obj) === "[object Object]"
  );
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
export function isFunction(value: unknown): value is (...args: any[]) => any {
  return (
    typeof value === "function" &&
    (Object.prototype.toString.call(value) === "[object Function]" ||
      Object.prototype.toString.call(value) === "[object AsyncFunction]")
  );
}

/**
 * 验证并处理加密密钥
 * 如果密钥长度为32字节则直接使用，否则使用SHA-256哈希算法处理成32字节
 * @param key - 原始密钥字符串
 * @returns 32字节长度的密钥Buffer
 */
function validateKey(key: string): Buffer {
  const keyBuffer = Buffer.from(key);
  if (keyBuffer.length === 32) return keyBuffer;
  return createHash("sha256").update(key).digest();
}
export function getEncryptionKey() {
  return process.env.ENCRYPT_KEY || ENC_DEFAULT_KEY;
}
/**
 * 使用AES-256-CBC算法加密文本
 * @param text 待加密的明文
 * @param key 32字节的加密密钥
 * @returns 加密后的字符串，格式为"iv:encryptedData"
 */
export function encrypt(text: string, key: string): string {
  if (isEmpty(key)) throw new Error("Encryption key cannot be empty");
  const keyBuffer = validateKey(key);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-cbc", keyBuffer, iv);
  let encrypted = cipher.update(text, "utf8");
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  // 返回IV和加密数据的十六进制拼接
  return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * 使用AES-256-CBC算法解密密文
 * @param encryptedText 加密后的字符串，格式为"iv:encryptedData"
 * @param key 32字节的解密密钥（需与加密密钥相同）
 * @returns 解密后的明文
 */
export function decrypt(encryptedText: string, key: string): string {
  const keyBuffer = validateKey(key);
  const [ivHex, encryptedHex] = encryptedText.split(":");

  // 验证加密文本格式
  if (!ivHex || !encryptedHex) {
    throw new Error(
      'Invalid encrypted text format. Expected "iv:encryptedData"'
    );
  }
  const iv = Buffer.from(ivHex, "hex");
  // 验证IV长度
  if (iv.length !== IV_LENGTH) {
    throw new Error(
      `Invalid IV length: ${iv.length} bytes. Expected ${IV_LENGTH} bytes.`
    );
  }
  const encrypted = Buffer.from(encryptedHex, "hex");
  const decipher = createDecipheriv("aes-256-cbc", keyBuffer, iv);
  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString("utf8");
}
export function getAbsolutePath(path: string, cwd?: string) {
  return resolve(cwd ?? process.cwd(), path);
}
function readPackage(): PackageJson {
  const pkgPath = resolve("package.json");
  if (!existsSync(pkgPath)) throw new Error("package.json not found");
  return JSON.parse(readFileSync(pkgPath, "utf8"));
}
function isPackage(path: string): boolean {
  // 处理scoped包（如@vue/reactivity）
  const isScopedPackage = path.startsWith("@") && path.split("/").length === 2;
  if (isScopedPackage) return true;
  // 相对路径（含./或../）不是包
  if (path.startsWith("./") || path.startsWith("../")) return false;
  // 绝对路径不是包
  if (isAbsolute(path)) return false;
  // 包含路径分隔符（且不是scoped包）的不是包（如./node_modules/xxx、a/b/c）
  const hasPathSeparator = path.includes("/") || path.includes(sep);
  if (hasPathSeparator) return false;
  // 其余情况视为包（如lodash、react等）
  return true;
}
export function importJson<T = Record<string, unknown>>(
  path: string,
  options: {
    /** 当文件不存在时是否抛出错误，默认为 false */
    throwIfMissing?: boolean;
    /** 当解析失败时是否抛出错误，默认为 false */
    throwIfInvalid?: boolean;
  } = {}
): T {
  const { throwIfMissing = false, throwIfInvalid = false } = options;
  // 检查文件是否存在
  if (!existsSync(path)) {
    const error = new Error(`JSON 文件不存在: ${path}`);
    if (throwIfMissing) throw error;
    console.warn(error.message); // 提供警告信息便于调试
    return {} as T;
  }
  try {
    // 读取并解析文件
    const content = readFileSync(path, "utf-8").trim();
    // 处理空文件情况
    if (!content) return {} as T;
    return JSON.parse(content) as T;
  } catch (error) {
    const parseError =
      error instanceof Error
        ? new Error(`解析 JSON 失败 (${path}): ${error.message}`)
        : new Error(`解析 JSON 失败 (${path})`);
    if (throwIfInvalid) throw parseError;
    return {} as T;
  }
}
export async function importModule<T = any>(
  path: string,
  cwd?: string
): Promise<T> {
  const isPkg = isPackage(path);
  const absolutePath = getAbsolutePath(path, cwd);
  if (typeof require === "undefined") {
    const module = await import(
      isPkg ? path : pathToFileURL(absolutePath).href
    );
    return (isPkg ? module : module.default ?? module) as T;
  } else {
    const module = require(isPkg ? path : absolutePath);
    if (module.default && Object.keys(module).length === 1)
      return module.default as T;
    if (module.__esModule) return (module.default ?? module) as T;
    return module as T;
  }
}
export function ENC(text: string) {
  return decrypt(text, getEncryptionKey());
}
export function set(str: string, value: any) {
  const keys = str.trim().split(".");
  const result = {};
  let current: Record<string, unknown> = result;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!current[key]) current[key] = {};
    current = current[key] as Record<string, unknown>;
  }
  const lastKey = keys[keys.length - 1];
  current[lastKey] = value;
  return result;
}

export function ctx(): CtxArgs {
  const pkg = readPackage();
  return {
    name: pkg!.name ?? "anyme",
    version: pkg!.version ?? "0.0.0",
    pkg,
    env: process.env.NODE_ENV || "development",
    ENC,
    ROOT: process.cwd(),
    HOME: resolve(process.env.HOME_PATH || "src"),
  };
}
export function defineConfig(configOptions: ConfigOptions): UserConfig {
  if (!isFunction(configOptions)) return configOptions;
  return configOptions(ctx());
}

export function all<T, U>(
  iterable: Iterable<T> | ArrayLike<T>,
  mapfn: (v: T, k: number) => U,
  thisArg?: any
): Promise<Awaited<U>[]>;

export function all<T>(
  iterable: Iterable<T> | ArrayLike<T>
): Promise<Awaited<T>[]>;

export function all<T, U>(
  iterable: Iterable<T> | ArrayLike<T>,
  mapfn?: (v: T, k: number) => U,
  thisArg?: any
) {
  return Promise.all(
    mapfn ? Array.from(iterable, mapfn, thisArg) : Array.from(iterable)
  );
}
