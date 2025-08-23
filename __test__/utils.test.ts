import {
  merge,
  deepMerge,
  isObject,
  isEmpty,
  isFunction,
  encrypt,
  decrypt,
  getAbsolutePath,
  importModule,
  ENC,
  set,
  defineConfig,
  all,
} from "../src/utils";
import { existsSync, writeFileSync, unlinkSync } from "node:fs";
import { resolve, join } from "node:path";

describe("utils", () => {
  describe("merge", () => {
    it("should merge two objects correctly", () => {
      const target = { a: 1, b: { c: 2 } };
      const source = { b: { d: 3 }, e: 4 };
      const result = merge(target, source as any);
      expect(result).toEqual({ a: 1, b: { c: 2, d: 3 }, e: 4 });
    });

    it("should return target when source is not an object", () => {
      const target = { a: 1 };
      const result = merge(target, null as any);
      expect(result).toEqual({ a: 1 });
    });

    it("should return source when target is not an object", () => {
      const source = { a: 1 };
      const result = merge(null as any, source);
      expect(result).toEqual({ a: 1 });
    });
  });

  describe("deepMerge", () => {
    it("should deep merge multiple objects", () => {
      const target = { a: 1, b: { c: 2, d: { e: 3 } } };
      const source1 = { b: { d: { f: 4 } }, g: 5 };
      const source2 = { a: 2, h: 6 };
      const result = deepMerge(target, source1 as any, source2);
      expect(result).toEqual({
        a: 2,
        b: { c: 2, d: { e: 3, f: 4 } },
        g: 5,
        h: 6,
      });
    });

    it("should return target when no sources provided", () => {
      const target = { a: 1 };
      const result = deepMerge(target);
      expect(result).toEqual({ a: 1 });
    });

    it("should ignore empty sources", () => {
      const target = { a: 1 };
      const result = deepMerge(target, {}, { b: 2 } as any);
      expect(result).toEqual({ a: 1, b: 2 });
    });
  });

  describe("isObject", () => {
    it("should return true for plain objects", () => {
      expect(isObject({})).toBe(true);
      expect(isObject({ a: 1 })).toBe(true);
    });

    it("should return false for non-objects", () => {
      expect(isObject(null)).toBe(false);
      expect(isObject([])).toBe(false);
      expect(isObject("string")).toBe(false);
      expect(isObject(123)).toBe(false);
      expect(isObject(true)).toBe(false);
    });
  });

  describe("isEmpty", () => {
    it("should return true for falsy values", () => {
      expect(isEmpty(null)).toBe(true);
      expect(isEmpty(undefined)).toBe(true);
      expect(isEmpty("")).toBe(true);
      expect(isEmpty(0)).toBe(true);
      expect(isEmpty(false)).toBe(true);
    });

    it("should return true for empty collections", () => {
      expect(isEmpty([])).toBe(true);
      expect(isEmpty("")).toBe(true);
      expect(isEmpty(new Map())).toBe(true);
      expect(isEmpty(new Set())).toBe(true);
      expect(isEmpty({})).toBe(true);
    });

    it("should return false for non-empty collections", () => {
      expect(isEmpty([1])).toBe(false);
      expect(isEmpty("a")).toBe(false);
      expect(isEmpty(new Map([["a", 1]]))).toBe(false);
      expect(isEmpty(new Set([1]))).toBe(false);
      expect(isEmpty({ a: 1 })).toBe(false);
    });
  });

  describe("isFunction", () => {
    it("should return true for functions", () => {
      expect(isFunction(() => {})).toBe(true);
      expect(isFunction(function () {})).toBe(true);
      expect(isFunction(async () => {})).toBe(true);
    });

    it("should return false for non-functions", () => {
      expect(isFunction(null)).toBe(false);
      expect(isFunction({})).toBe(false);
      expect(isFunction([])).toBe(false);
      expect(isFunction("string")).toBe(false);
      expect(isFunction(123)).toBe(false);
    });
  });

  describe("encrypt/decrypt", () => {
    const testKey = "12345678901234567890123456789012"; // 32 bytes key
    const testData = "This is a test string";

    it("should encrypt and decrypt data correctly", () => {
      const encrypted = encrypt(testData, testKey);
      const decrypted = decrypt(encrypted, testKey);
      expect(decrypted).toBe(testData);
    });

    it("should throw error with empty key", () => {
      expect(() => encrypt(testData, "")).toThrow(
        "Encryption key cannot be empty"
      );
    });

    it("should handle invalid encrypted text format", () => {
      expect(() => decrypt("invalid_format", testKey)).toThrow(
        'Invalid encrypted text format. Expected "iv:encryptedData"'
      );
    });

    it("should work with key that needs hashing", () => {
      const shortKey = "short_key";
      const encrypted = encrypt(testData, shortKey);
      const decrypted = decrypt(encrypted, shortKey);
      expect(decrypted).toBe(testData);
    });
  });

  describe("getAbsolutePath", () => {
    it("should return absolute path for relative path", () => {
      const relativePath = "src/utils";
      const absolutePath = getAbsolutePath(relativePath);
      expect(absolutePath).toBe(resolve(relativePath));
    });

    it("should return the same path for absolute path", () => {
      const absolutePath = resolve("src/utils");
      const result = getAbsolutePath(absolutePath);
      expect(result).toBe(absolutePath);
    });
  });

  describe("importModule", () => {
    it("should handle JSON files", async () => {
      const pkgPath = resolve("package.json");
      const result = await importModule(pkgPath);
      expect(result).toHaveProperty("name");
    });
  });

  describe("set", () => {
    it("should create nested object from dot notation", () => {
      const result = set("a.b.c", "value");
      expect(result).toEqual({ a: { b: { c: "value" } } });
    });

    it("should handle simple key", () => {
      const result = set("key", "value");
      expect(result).toEqual({ key: "value" });
    });
  });

  describe("defineConfig", () => {
    it("should return config object directly if not a function", () => {
      const config = { a: 1 };
      const result = defineConfig(config as any);
      expect(result).toBe(config);
    });

    it("should execute function if config is a function", () => {
      const configFn = () => ({ a: 1 });
      const result = defineConfig(configFn as any);
      expect(result).toEqual({ a: 1 });
    });
  });

  describe("all", () => {
    it("should resolve all promises", async () => {
      const promises = [Promise.resolve(1), Promise.resolve(2)];
      const result = await all(promises);
      expect(result).toEqual([1, 2]);
    });

    it("should map values with map function", async () => {
      const values = [1, 2, 3];
      const result = await all(values, (v) => Promise.resolve(v * 2));
      expect(result).toEqual([2, 4, 6]);
    });
  });
});
