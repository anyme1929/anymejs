import { ACache } from "../src/core/cache";
describe("ACache", () => {
  let cache: ACache<any>;

  beforeEach(() => {
    cache = new ACache();
  });

  afterEach(() => {
    cache.close();
  });

  describe("constructor", () => {
    it("should create a cache instance with default options", () => {
      const newCache = new ACache();
      expect(newCache).toBeInstanceOf(ACache);
      newCache.close();
    });

    it("should create a cache instance with custom options", () => {
      const newCache = new ACache({ maxSize: 100, maxMemorySize: 1024 });
      expect(newCache).toBeInstanceOf(ACache);
      newCache.close();
    });
  });

  describe("set and get", () => {
    it("should set and get a value", () => {
      cache.set("key1", "value1");
      expect(cache.get("key1")).toBe("value1");
    });

    it("should return undefined for non-existent keys", () => {
      expect(cache.get("nonexistent")).toBeUndefined();
    });

    it("should overwrite existing keys", () => {
      cache.set("key1", "value1");
      cache.set("key1", "value2");
      expect(cache.get("key1")).toBe("value2");
    });

    it("should handle different data types", () => {
      cache.set("string", "text");
      cache.set("number", 42);
      cache.set("boolean", true);
      cache.set("object", { a: 1, b: 2 });
      cache.set("array", [1, 2, 3]);

      expect(cache.get("string")).toBe("text");
      expect(cache.get("number")).toBe(42);
      expect(cache.get("boolean")).toBe(true);
      expect(cache.get("object")).toEqual({ a: 1, b: 2 });
      expect(cache.get("array")).toEqual([1, 2, 3]);
    });
  });

  describe("mset and mget", () => {
    it("should set multiple values", () => {
      const entries = [
        { key: "key1", value: "value1" },
        { key: "key2", value: "value2" },
        { key: "key3", value: "value3" },
      ];

      const result = cache.mset(entries);
      expect(result).toBe(3);

      const values = cache.mget(["key1", "key2", "key3"]);
      expect(values).toEqual({
        key1: "value1",
        key2: "value2",
        key3: "value3",
      });
    });

    it("should handle empty entries in mset", () => {
      const result = cache.mset([]);
      expect(result).toBe(0);
    });
  });

  describe("delete", () => {
    it("should delete existing keys", () => {
      cache.set("key1", "value1");
      expect(cache.delete("key1")).toBe(true);
      expect(cache.get("key1")).toBeUndefined();
    });

    it("should return false when deleting non-existent keys", () => {
      expect(cache.delete("nonexistent")).toBe(false);
    });

    it("should handle deleteMany", () => {
      cache.set("key1", "value1");
      cache.set("key2", "value2");
      cache.set("key3", "value3");

      const deleted = cache.deleteMany(["key1", "key3", "nonexistent"]);
      expect(deleted).toBe(2);
      expect(cache.get("key1")).toBeUndefined();
      expect(cache.get("key2")).toBe("value2");
      expect(cache.get("key3")).toBeUndefined();
    });
  });

  describe("has", () => {
    it("should return true for existing keys", () => {
      cache.set("key1", "value1");
      expect(cache.has("key1")).toBe(true);
    });

    it("should return false for non-existent keys", () => {
      expect(cache.has("nonexistent")).toBe(false);
    });
  });

  describe("ttl and expiration", () => {
    it("should handle expiration", (done) => {
      cache.set("key1", "value1", 50); // 50ms ttl

      expect(cache.get("key1")).toBe("value1");
      expect(cache.has("key1")).toBe(true);

      setTimeout(() => {
        expect(cache.get("key1")).toBeUndefined();
        expect(cache.has("key1")).toBe(false);
        done();
      }, 100);
    });

    it("should handle expiration in mget", (done) => {
      cache.set("key1", "value1", 50);
      cache.set("key2", "value2");

      setTimeout(() => {
        const values = cache.mget(["key1", "key2"]);
        expect(values).toEqual({
          key1: undefined,
          key2: "value2",
        });
        done();
      }, 100);
    });
  });

  describe("clear", () => {
    it("should clear all entries", () => {
      cache.set("key1", "value1");
      cache.set("key2", "value2");

      expect(cache.get("key1")).toBe("value1");
      expect(cache.get("key2")).toBe("value2");

      cache.clear();

      expect(cache.get("key1")).toBeUndefined();
      expect(cache.get("key2")).toBeUndefined();
      expect(cache.keys().length).toBe(0);
    });
  });

  describe("keys", () => {
    it("should return all keys", () => {
      cache.set("key1", "value1");
      cache.set("key2", "value2");
      cache.set("key3", "value3");

      const keys = cache.keys();
      expect(keys).toEqual(expect.arrayContaining(["key1", "key2", "key3"]));
      expect(keys.length).toBe(3);
    });
  });

  describe("stats", () => {
    it("should track hits and misses", () => {
      cache.set("key1", "value1");

      cache.get("key1"); // hit
      cache.get("key2"); // miss
      cache.get("key1"); // hit
      cache.get("key3"); // miss

      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(2);
    });

    it("should reset stats", () => {
      cache.set("key1", "value1");
      cache.get("key1");
      cache.get("key2");

      const statsBefore = cache.getStats();
      expect(statsBefore.hits).toBe(1);
      expect(statsBefore.misses).toBe(1);

      cache.resetStats();

      const statsAfter = cache.getStats();
      expect(statsAfter.hits).toBe(0);
      expect(statsAfter.misses).toBe(0);
      expect(statsAfter.size).toBe(statsBefore.size); // Size should remain
    });
  });

  describe("maxSize limit", () => {
    it("should evict items when maxSize is exceeded", () => {
      const smallCache = new ACache({ maxSize: 2 });

      smallCache.set("key1", "value1");
      smallCache.set("key2", "value2");
      smallCache.set("key3", "value3");

      // At least one item should be evicted due to maxSize limit
      const keys = smallCache.keys();
      expect(keys.length).toBeLessThan(3);

      smallCache.close();
    });
  });

  describe("getOrSet", () => {
    it("should return existing value without calling factory", async () => {
      cache.set("key1", "value1");

      let factoryCalled = false;
      const factory = () => {
        factoryCalled = true;
        return "newvalue";
      };

      const result = await cache.getOrSet("key1", factory);
      expect(result).toBe("value1");
      expect(factoryCalled).toBe(false);
    });

    it("should set and return value from factory when key does not exist", async () => {
      let factoryCalled = false;
      const factory = () => {
        factoryCalled = true;
        return "factoryValue";
      };

      const result = await cache.getOrSet("key1", factory);
      expect(result).toBe("factoryValue");
      expect(factoryCalled).toBe(true);
      expect(cache.get("key1")).toBe("factoryValue");
    });
  });
});
