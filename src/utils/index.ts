import { existsSync, readFileSync } from "node:fs";
import { join, isAbsolute } from "node:path";
import {
  randomBytes,
  createCipheriv,
  createDecipheriv,
  createHash,
} from "node:crypto";
import type { DeepPartial, UserConfig, LoadEnvOptions } from "../types";
import { ENC_DEFAULT_KEY, IV_LENGTH } from "./constants";
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
export function defineConfig(config: UserConfig): UserConfig {
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
  try {
    const keyBuffer = validateKey(key);
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv("aes-256-cbc", keyBuffer, iv);
    let encrypted = cipher.update(text, "utf8");
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    // 返回IV和加密数据的十六进制拼接
    return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
  } catch (error) {
    console.error(
      "Encryption failed:",
      error instanceof Error ? error.message : String(error)
    );
    throw error;
  }
}

/**
 * 使用AES-256-CBC算法解密密文
 * @param encryptedText 加密后的字符串，格式为"iv:encryptedData"
 * @param key 32字节的解密密钥（需与加密密钥相同）
 * @returns 解密后的明文
 */
export function decrypt(encryptedText: string, key: string): string {
  try {
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
  } catch (error) {
    console.error(
      "Decryption failed:",
      error instanceof Error ? error.message : String(error)
    );
    throw error;
  }
}
export function ENC(text: string) {
  return decrypt(text, getEncryptionKey());
}
