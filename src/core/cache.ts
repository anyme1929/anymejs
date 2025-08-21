/**
 * 基于内存的缓存实现，支持过期时间和多种淘汰策略
 */
class MemoryCache<T = any> {
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
  private evictionPolicy: EvictionPolicy;

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
    process.on("exit", () => {
      if (this.cleanupInterval) {
        clearInterval(this.cleanupInterval);
      }
    });
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
   */
  private evictItems(): void {
    const isOverSizeLimit = this.cache.size >= this.maxSize;
    const isOverMemoryLimit =
      this.maxMemorySize > 0 && this.currentMemorySize >= this.maxMemorySize;

    if (!isOverSizeLimit && !isOverMemoryLimit) {
      return;
    }

    let keysToRemove: string[] = [];

    switch (this.evictionPolicy) {
      case "lru": {
        // 所以第一个元素就是最近最少使用的
        // Map会记住插入顺序，我们可以通过重新插入来更新顺序
        // LRU策略：移除最近最少使用的项
        const lruKey = this.cache.keys().next().value;
        if (lruKey) {
          keysToRemove = [lruKey];
        }
        break;
      }
      case "fifo": {
        // FIFO策略：移除最早插入的项
        const fifoKey = this.cache.keys().next().value;
        if (fifoKey) {
          keysToRemove = [fifoKey];
        }
        break;
      }
      case "lfu": {
        // LFU策略：移除使用频率最低的项
        let minFrequency = Infinity;
        let leastFrequentKeys: string[] = [];

        for (const [key, item] of this.cache.entries()) {
          if (item.accessCount < minFrequency) {
            minFrequency = item.accessCount;
            leastFrequentKeys = [key];
          } else if (item.accessCount === minFrequency) {
            leastFrequentKeys.push(key);
          }
        }

        // 如果有多个使用频率相同的项，移除最早的
        if (leastFrequentKeys.length > 0) {
          // 找到最早插入的项
          let oldestTime = Infinity;
          let oldestKey = leastFrequentKeys[0];

          for (const key of leastFrequentKeys) {
            const item = this.cache.get(key);
            if (item && item.createdAt < oldestTime) {
              oldestTime = item.createdAt;
              oldestKey = key;
            }
          }

          keysToRemove = [oldestKey];
        }
        break;
      }
    }

    keysToRemove.forEach((key) => {
      const item = this.cache.get(key);
      if (item) {
        this.currentMemorySize -= item.size;
      }
      this.cache.delete(key);
    });

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
    try {
      const jsonString = JSON.stringify(obj);
      return Buffer.byteLength(jsonString, "utf8");
    } catch (error) {
      // 如果无法序列化，返回一个估计值
      if (typeof obj === "string") {
        return obj.length * 2; // 假设每个字符2字节
      } else if (typeof obj === "number") {
        return 8; // 数字通常占8字节
      } else if (typeof obj === "boolean") {
        return 4; // 布尔值通常占4字节
      } else if (Array.isArray(obj)) {
        // 粗略估计数组大小
        return obj.length * 16;
      } else if (obj && typeof obj === "object") {
        // 粗略估计对象大小
        return Object.keys(obj).length * 32;
      }

      return 16; // 默认值
    }
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
   * 设置缓存项
   * @param key 缓存键
   * @param value 缓存值
   * @param ttl 过期时间(毫秒)，undefined表示永不过期
   * @returns 是否设置成功
   */
  set(key: string, value: T, ttl?: number): boolean {
    const now = Date.now();
    const expiresAt = ttl ? now + ttl : undefined;
    const size = this.estimateSize(value);

    // 检查内存限制
    if (this.maxMemorySize > 0 && size > this.maxMemorySize) {
      return false; // 单个项目太大，无法缓存
    }

    // 检查是否已存在该键
    const existingItem = this.cache.get(key);
    const accessCount = existingItem ? existingItem.accessCount + 1 : 1;

    const item: CacheItem<T> = {
      value,
      size,
      createdAt: now,
      expiresAt,
      lastAccessed: now,
      accessCount,
    };

    // 如果是新键，可能需要先淘汰旧键
    if (!existingItem) {
      // 检查是否超过限制
      const isOverSizeLimit = this.cache.size >= this.maxSize;
      const isOverMemoryLimit =
        this.maxMemorySize > 0 &&
        this.currentMemorySize + size > this.maxMemorySize;

      if (isOverSizeLimit || isOverMemoryLimit) {
        this.evictItems();

        // 再次检查是否还有空间
        const stillOverSizeLimit = this.cache.size >= this.maxSize;
        const stillOverMemoryLimit =
          this.maxMemorySize > 0 &&
          this.currentMemorySize + size > this.maxMemorySize;

        if (stillOverSizeLimit || stillOverMemoryLimit) {
          return false; // 没有足够的空间
        }
      }
    } else {
      // 对于已存在的键，先减去旧项目的大小
      this.currentMemorySize -= existingItem.size;

      // 对于LRU策略，先删除再插入以更新顺序
      if (this.evictionPolicy === "lru") {
        this.cache.delete(key);
      }
    }

    this.cache.set(key, item);
    this.currentMemorySize += size;
    this.stats.size = this.cache.size;
    this.stats.memorySize = this.currentMemorySize;

    return true;
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
    const item = this.cache.get(key);
    if (!item) {
      return false;
    }

    this.currentMemorySize -= item.size;
    const result = this.cache.delete(key);
    this.stats.size = this.cache.size;
    this.stats.memorySize = this.currentMemorySize;

    return result;
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

/**
 * 缓存项接口
 */
interface CacheItem<T> {
  /**
   * 缓存的值
   */
  value: T;

  /**
   * 缓存项大小估算（字节）
   */
  size: number;

  /**
   * 创建时间戳(毫秒)
   */
  createdAt: number;

  /**
   * 过期时间戳(毫秒)，undefined表示永不过期
   */
  expiresAt?: number;

  /**
   * 最后访问时间戳(毫秒)
   */
  lastAccessed: number;

  /**
   * 访问次数
   */
  accessCount: number;
}

/**
 * 缓存配置选项接口
 */
interface CacheOptions {
  /**
   * 最大缓存容量（项目数量），默认1000
   */
  maxSize?: number;

  /**
   * 最大内存使用量（字节），0表示无限制，默认0
   */
  maxMemorySize?: number;

  /**
   * 缓存淘汰策略，默认'lru'
   */
  evictionPolicy?: EvictionPolicy;

  /**
   * 定期清理过期项的间隔时间(毫秒)，默认60000(1分钟)
   */
  cleanupIntervalMs?: number;
}

/**
 * 缓存淘汰策略类型
 */
type EvictionPolicy = "lru" | "fifo" | "lfu";

/**
 * 缓存统计信息接口
 */
interface CacheStats {
  /**
   * 缓存命中次数
   */
  hits: number;

  /**
   * 缓存未命中次数
   */
  misses: number;

  /**
   * 当前缓存大小（项目数量）
   */
  size: number;

  /**
   * 最大缓存容量（项目数量）
   */
  maxSize: number;

  /**
   * 被淘汰的缓存项数量
   */
  evictions: number;

  /**
   * 当前内存使用量（字节）
   */
  memorySize: number;

  /**
   * 最大内存使用量（字节）
   */
  maxMemorySize: number;
}

export default MemoryCache;
