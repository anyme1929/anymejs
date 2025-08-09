import type { DeepPartial, userConfig } from "../types";
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
