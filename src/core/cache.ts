import { CacheOptions, CacheStats, ICache, CacheItem } from "../types";
/**
 * 基于内存的缓存实现，支持过期时间和多种淘汰策略
 */
class MemoryCache<T = any> implements ICache<T> {
  /**
   * 缓存存储结构
   */
  private cache: Map<string, CacheItem<T>>;

  /**
   * 最大缓存容量
   */
  private maxSize: number;

  /**
   * 缓存淘汰策略
   */
  private evictionPolicy: "lru" | "fifo" | "lfu";

  /**
   * 缓存统计信息
   */
  private stats: CacheStats;

  /**
   * 定期清理过期项的定时器ID
   */
  private cleanupInterval: NodeJS.Timeout | null = null;

  /**
   * 定期清理的间隔时间(毫秒)
   */
  private cleanupIntervalMs: number;

  /**
   * 当前缓存占用的内存大小（字节）
   */
  private currentMemorySize: number = 0;

  /**
   * 最大内存限制（字节），0表示无限制
   */
  private maxMemorySize: number = 0;

  /**
   * 创建一个内存缓存实例
   * @param options 缓存配置选项
   */
  constructor(options: CacheOptions = {}) {
    this.cache = new Map();
    this.maxSize = options.maxSize ?? 1000;
    this.evictionPolicy = options.evictionPolicy ?? "lru";
    this.cleanupIntervalMs = options.cleanupIntervalMs ?? 60000; // 默认1分钟清理一次
    this.maxMemorySize = options.maxMemorySize ?? 0; // 默认无内存限制

    this.stats = {
      hits: 0,
      misses: 0,
      size: 0,
      maxSize: this.maxSize,
      evictions: 0,
      memorySize: 0,
      maxMemorySize: this.maxMemorySize,
    };

    // 启动定期清理过期项的任务
    this.startCleanupInterval();
  }

  /**
   * 启动定期清理过期项的定时器
   */
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredItems();
    }, this.cleanupIntervalMs);

    // 确保进程退出时清理定时器
    if (typeof process !== "undefined" && process.on) {
      process.on("exit", () => {
        if (this.cleanupInterval) {
          clearInterval(this.cleanupInterval);
        }
      });
    }
  }

  /**
   * 清理所有过期的缓存项
   */
  private cleanupExpiredItems(): void {
    const now = Date.now();
    let removedCount = 0;

    for (const [key, item] of this.cache.entries()) {
      if (item.expiresAt && item.expiresAt < now) {
        this.currentMemorySize -= item.size;
        this.cache.delete(key);
        removedCount++;
      }
    }

    this.stats.size = this.cache.size;
    this.stats.memorySize = this.currentMemorySize;
  }

  /**
   * 当缓存达到最大容量时，根据淘汰策略移除缓存项
   * @param neededSpace 需要腾出的空间大小（字节）
   * @param neededSlots 需要腾出的项目数量
   */
  private evictItems(neededSpace: number = 0, neededSlots: number = 1): void {
    const isOverSizeLimit = this.cache.size + neededSlots > this.maxSize;
    const isOverMemoryLimit =
      this.maxMemorySize > 0 &&
      this.currentMemorySize + neededSpace > this.maxMemorySize;

    if (!isOverSizeLimit && !isOverMemoryLimit) return;

    const keysToRemove: string[] = [];
    let freedSpace = 0;
    let freedSlots = 0;

    // 需要释放的空间或槽位
    const targetSpace = isOverMemoryLimit
      ? Math.max(
          neededSpace,
          this.currentMemorySize + neededSpace - this.maxMemorySize
        )
      : 0;
    const targetSlots = isOverSizeLimit
      ? Math.max(neededSlots, this.cache.size + neededSlots - this.maxSize)
      : 0;

    switch (this.evictionPolicy) {
      case "lru": {
        // LRU策略：移除最近最少使用的项
        // 对于LRU，我们按照访问时间排序，最近最少访问的在前
        const sortedEntries = Array.from(this.cache.entries()).sort(
          (a, b) => a[1].lastAccessed - b[1].lastAccessed
        );
        for (const [key, item] of sortedEntries) {
          if (
            (targetSlots > 0 && freedSlots >= targetSlots) ||
            (targetSpace > 0 && freedSpace >= targetSpace)
          ) {
            break;
          }
          keysToRemove.push(key);
          freedSpace += item.size;
          freedSlots++;
        }
        break;
      }

      case "fifo": {
        // FIFO策略：移除最早插入的项
        // Map保持插入顺序，所以直接遍历即可
        for (const key of this.cache.keys()) {
          if (
            (targetSlots > 0 && freedSlots >= targetSlots) ||
            (targetSpace > 0 && freedSpace >= targetSpace)
          ) {
            break;
          }

          keysToRemove.push(key);
          const item = this.cache.get(key);
          if (item) {
            freedSpace += item.size;
            freedSlots++;
          }
        }
        break;
      }

      case "lfu": {
        // LFU策略：移除使用频率最低的项
        const sortedEntries = Array.from(this.cache.entries()).sort((a, b) => {
          // 首先按访问次数排序（次数少的优先淘汰）
          if (a[1].accessCount !== b[1].accessCount) {
            return a[1].accessCount - b[1].accessCount;
          }
          // 访问次数相同的按最后访问时间排序（更久未访问的优先淘汰）
          return a[1].lastAccessed - b[1].lastAccessed;
        });

        for (const [key, item] of sortedEntries) {
          if (
            (targetSlots > 0 && freedSlots >= targetSlots) ||
            (targetSpace > 0 && freedSpace >= targetSpace)
          ) {
            break;
          }

          keysToRemove.push(key);
          freedSpace += item.size;
          freedSlots++;
        }
        break;
      }
    }

    // 执行删除操作
    for (const key of keysToRemove) {
      const item = this.cache.get(key);
      if (item) {
        this.currentMemorySize -= item.size;
        this.cache.delete(key);
      }
    }

    this.stats.evictions += keysToRemove.length;
    this.stats.size = this.cache.size;
    this.stats.memorySize = this.currentMemorySize;
  }
  /**
   * 估算对象的内存占用大小（字节）
   * @param obj 要估算的对象
   * @returns 估算的大小（字节）
   */
  private estimateSize(obj: any): number {
    // 使用WeakMap缓存已计算过的对象大小，避免重复计算和循环引用
    const objectSizes = new WeakMap<object, number>();

    const calculateSize = (obj: any): number => {
      // 使用更准确的大小估算方法
      if (obj === null || obj === undefined) return 0;

      switch (typeof obj) {
        case "number":
          return 8;
        case "string":
          // 使用Buffer.byteLength获取准确的字节长度
          return Buffer.byteLength(obj, "utf8");
        case "boolean":
          return 4;
        case "bigint":
          return 8;
        case "symbol":
          return 8;
        case "object": {
          // 检查是否已计算过该对象大小（处理循环引用）
          if (objectSizes.has(obj)) {
            return objectSizes.get(obj)!;
          }

          // 先设置一个默认值防止循环引用
          objectSizes.set(obj, 0);

          let size: number;
          if (Array.isArray(obj)) {
            // 数组的大小是各元素大小之和加上数组开销
            size = obj.reduce((acc, item) => acc + calculateSize(item), 24);
          } else if (obj instanceof Date) {
            size = 8;
          } else if (obj instanceof Map || obj instanceof Set) {
            // 对于Map和Set，估算其大小
            size = 24; // 基础开销
            if (obj instanceof Map) {
              for (const [key, value] of obj.entries()) {
                size += calculateSize(key) + calculateSize(value);
              }
            } else {
              for (const value of obj.values()) {
                size += calculateSize(value);
              }
            }
          } else if (obj.constructor === Object || obj.constructor === null) {
            // 纯对象的大小是各属性值大小之和加上对象开销
            size = Object.keys(obj).reduce((acc, key) => {
              return (
                acc + Buffer.byteLength(key, "utf8") + calculateSize(obj[key])
              );
            }, 24);
          } else {
            // 其他对象类型，使用JSON序列化估算（不完美但相对合理）
            try {
              size = Buffer.byteLength(JSON.stringify(obj), "utf8") + 24;
            } catch (e) {
              // 如果无法序列化，给出一个估计值
              size = 64;
            }
          }
          // 更新对象大小缓存
          objectSizes.set(obj, size);
          return size;
        }
        case "function":
          // 函数对象的大小估算
          return 32;
        default:
          return 16; // 默认值
      }
    };
    return calculateSize(obj);
  }

  /**
   * 获取缓存项
   * @param key 缓存键
   * @returns 缓存值，如果不存在或已过期则返回undefined
   */
  get(key: string): T | undefined {
    const now = Date.now();
    const item = this.cache.get(key);

    if (!item) {
      this.stats.misses++;
      return undefined;
    }

    // 检查是否过期
    if (item.expiresAt && item.expiresAt < now) {
      this.currentMemorySize -= item.size;
      this.cache.delete(key);
      this.stats.size = this.cache.size;
      this.stats.misses++;
      this.stats.memorySize = this.currentMemorySize;
      return undefined;
    }
    // 更新访问信息（用于LRU和LFU策略）
    item.lastAccessed = now;
    item.accessCount++;
    // 对于LRU策略，删除后重新插入以更新顺序
    if (this.evictionPolicy === "lru") {
      this.cache.delete(key);
      this.cache.set(key, item);
    }
    this.stats.hits++;
    return item.value;
  }

  /**
   * 批量获取缓存项
   * @param keys 缓存键数组
   * @returns 键值对对象，包含所有存在的缓存项
   */
  mget(keys: string[]): Record<string, T | undefined> {
    const result: Record<string, T | undefined> = {};
    const now = Date.now();

    for (const key of keys) {
      const item = this.cache.get(key);

      if (!item) {
        result[key] = undefined;
        this.stats.misses++;
        continue;
      }

      // 检查是否过期
      if (item.expiresAt && item.expiresAt < now) {
        this.currentMemorySize -= item.size;
        this.cache.delete(key);
        result[key] = undefined;
        this.stats.misses++;
        continue;
      }

      // 更新访问信息（用于LRU和LFU策略）
      item.lastAccessed = now;
      item.accessCount++;

      // 对于LRU策略，删除后重新插入以更新顺序
      if (this.evictionPolicy === "lru") {
        this.cache.delete(key);
        this.cache.set(key, item);
      }

      result[key] = item.value;
      this.stats.hits++;
    }

    this.stats.size = this.cache.size;
    this.stats.memorySize = this.currentMemorySize;

    return result;
  }

  /**
   * 设置缓存项
   * @param key 缓存键
   * @param value 缓存值
   * @param ttl 过期时间(毫秒)，undefined表示永不过期
   * @returns 是否设置成功
   */
  set(key: string, value: T, ttl?: number): boolean {
    return this.mset([{ key, value, ttl }]) === 1;
  }

  /**
   * 批量设置缓存项
   * @param entries 缓存项数组
   * @returns 成功设置的项目数量
   */
  mset(entries: { key: string; value: T; ttl?: number }[]): number {
    if (entries.length === 0) {
      return 0;
    }

    const now = Date.now();
    let successCount = 0;
    let totalSize = 0;
    const itemsToSet: [string, CacheItem<T>][] = [];

    // 先计算所有项目的大小和检查限制
    for (const { key, value, ttl } of entries) {
      const size = this.estimateSize(value);

      // 检查内存限制
      if (this.maxMemorySize > 0 && size > this.maxMemorySize) {
        continue; // 单个项目太大，跳过
      }

      const existingItem = this.cache.get(key);
      const accessCount = existingItem ? existingItem.accessCount + 1 : 1;
      const expiresAt = ttl ? now + ttl : undefined;

      itemsToSet.push([
        key,
        {
          value,
          size,
          createdAt: now,
          expiresAt,
          lastAccessed: now,
          accessCount,
        },
      ]);

      totalSize += size;

      // 减去已存在项目的大小（如果会被覆盖）
      if (existingItem) {
        totalSize -= existingItem.size;
      }
    }

    // 检查是否需要淘汰项目
    const newItemsCount = itemsToSet.length;
    const isOverSizeLimit = this.cache.size + newItemsCount > this.maxSize;
    const isOverMemoryLimit =
      this.maxMemorySize > 0 &&
      this.currentMemorySize + totalSize > this.maxMemorySize;

    if (isOverSizeLimit || isOverMemoryLimit) {
      this.evictItems(
        isOverMemoryLimit
          ? Math.max(0, this.currentMemorySize + totalSize - this.maxMemorySize)
          : 0,
        isOverSizeLimit
          ? Math.max(0, this.cache.size + newItemsCount - this.maxSize)
          : 0
      );

      // 再次检查是否有足够空间
      const stillOverSizeLimit = this.cache.size + newItemsCount > this.maxSize;
      const stillOverMemoryLimit =
        this.maxMemorySize > 0 &&
        this.currentMemorySize + totalSize > this.maxMemorySize;

      if (stillOverSizeLimit || stillOverMemoryLimit) {
        return 0; // 没有足够的空间
      }
    }

    // 设置所有项目
    for (const [key, item] of itemsToSet) {
      const existingItem = this.cache.get(key);

      // 减去已存在项目的大小
      if (existingItem) {
        this.currentMemorySize -= existingItem.size;
      }

      // 对于LRU策略，先删除再插入以更新顺序
      if (this.evictionPolicy === "lru" && existingItem) {
        this.cache.delete(key);
      }

      this.cache.set(key, item);
      this.currentMemorySize += item.size;
      successCount++;
    }

    this.stats.size = this.cache.size;
    this.stats.memorySize = this.currentMemorySize;

    return successCount;
  }

  /**
   * 获取缓存项，如果不存在则设置
   * @param key 缓存键
   * @param factory 用于生成值的工厂函数
   * @param ttl 过期时间(毫秒)，可选
   * @returns 缓存值
   */
  async getOrSet(
    key: string,
    factory: () => T | Promise<T>,
    ttl?: number
  ): Promise<T> {
    const value = this.get(key);
    if (value !== undefined) {
      return value;
    }

    const newValue = await factory();
    this.set(key, newValue, ttl);
    return newValue;
  }

  /**
   * 删除缓存项
   * @param key 缓存键
   * @returns 如果成功删除则返回true，否则返回false
   */
  delete(key: string): boolean {
    return this.deleteMany([key]) > 0;
  }

  /**
   * 批量删除缓存项
   * @param keys 缓存键数组
   * @returns 成功删除的项目数量
   */
  deleteMany(keys: string[]): number {
    let deletedCount = 0;

    for (const key of keys) {
      const item = this.cache.get(key);
      if (item) {
        this.currentMemorySize -= item.size;
        this.cache.delete(key);
        deletedCount++;
      }
    }

    this.stats.size = this.cache.size;
    this.stats.memorySize = this.currentMemorySize;

    return deletedCount;
  }

  /**
   * 清空所有缓存项
   */
  clear(): void {
    this.cache.clear();
    this.currentMemorySize = 0;
    this.stats = {
      ...this.stats,
      size: 0,
      hits: 0,
      misses: 0,
      evictions: 0,
      memorySize: 0,
    };
  }

  /**
   * 检查缓存项是否存在且未过期
   * @param key 缓存键
   * @returns 如果存在且未过期则返回true，否则返回false
   */
  has(key: string): boolean {
    const now = Date.now();
    const item = this.cache.get(key);

    if (!item) return false;
    if (item.expiresAt && item.expiresAt < now) {
      this.currentMemorySize -= item.size;
      this.cache.delete(key);
      this.stats.size = this.cache.size;
      this.stats.memorySize = this.currentMemorySize;
      return false;
    }

    return true;
  }

  /**
   * 获取缓存中所有的键
   * @returns 键的数组
   */
  keys(): string[] {
    this.cleanupExpiredItems(); // 先清理过期项
    return Array.from(this.cache.keys());
  }

  /**
   * 获取缓存统计信息
   * @returns 缓存统计信息
   */
  getStats(): Readonly<CacheStats> {
    return { ...this.stats };
  }

  /**
   * 重置统计信息（除了大小限制）
   */
  resetStats(): void {
    this.stats = {
      ...this.stats,
      hits: 0,
      misses: 0,
      evictions: 0,
    };
  }

  /**
   * 关闭缓存，清理资源
   */
  close(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
  }
}

export default MemoryCache;
