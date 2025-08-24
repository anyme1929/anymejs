/**
 * 缓存配置选项接口
 */
export interface CacheOptions {
  /**
   * 最大缓存容量（项目数量），默认1000
   */
  maxSize?: number;

  /**
   * 最大内存使用量（字节），0表示无限制，默认0
   */
  maxMemorySize?: number;

  /**
   * 定期清理过期项的间隔时间(毫秒)，默认60000(1分钟)
   */
  cleanupIntervalMs?: number;
}
/**
 * 缓存统计信息接口
 */
export interface CacheStats {
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
/**
 * 缓存项接口
 */
export interface CacheItem<T> {
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
 * 批量设置缓存项的参数接口
 */
export interface MSetEntry<T = any> {
  /**
   * 缓存键
   */
  key: string;

  /**
   * 缓存值
   */
  value: T;

  /**
   * 过期时间(毫秒)，undefined表示永不过期
   */
  ttl?: number;
}
/**
 * 基于内存的LRU缓存实现，支持过期时间和容量限制
 */
export class ACache<T = any> {
  private cache: Map<string, CacheItem<T>>; // 利用Map的插入顺序特性实现LRU
  private maxSize: number; // 最大缓存条目数
  private maxMemorySize: number; // 最大内存占用(字节)，0表示无限制
  private stats: CacheStats; // 缓存统计信息
  private cleanupInterval: NodeJS.Timeout | null = null; // 过期清理定时器
  private currentMemorySize = 0; // 当前内存占用(字节)

  constructor(options: CacheOptions = {}) {
    this.cache = new Map();
    this.maxSize = options.maxSize ?? 1000;
    this.maxMemorySize = options.maxMemorySize ?? 0;
    this.cleanupInterval = setInterval(
      () => this.cleanupExpiredItems(),
      options.cleanupIntervalMs ?? 60000 // 默认1分钟清理一次过期项
    );

    // 初始化统计信息
    this.stats = {
      hits: 0,
      misses: 0,
      size: 0,
      maxSize: this.maxSize,
      evictions: 0,
      memorySize: 0,
      maxMemorySize: this.maxMemorySize,
    };

    // 进程退出时清理定时器
    if (typeof process !== "undefined" && process.on) {
      process.on("exit", () => this.close());
    }
  }

  /** 清理所有过期缓存项 */
  private cleanupExpiredItems(): void {
    const now = Date.now();
    let removed = 0;

    for (const [key, item] of this.cache.entries()) {
      if (item.expiresAt && item.expiresAt < now) {
        this.currentMemorySize -= item.size;
        this.cache.delete(key);
        removed++;
      }
    }

    this.updateStats();
  }

  /** 当缓存超限时，按LRU策略淘汰最久未使用的项 */
  private evictItems(neededSpace: number = 0): void {
    const isOverSize = this.cache.size >= this.maxSize;
    const isOverMemory =
      this.maxMemorySize > 0 &&
      this.currentMemorySize + neededSpace > this.maxMemorySize;

    if (!isOverSize && !isOverMemory) return;

    // 按最后访问时间排序(最久未使用的在前)
    const sortedEntries = Array.from(this.cache.entries()).sort(
      (a, b) => a[1].lastAccessed - b[1].lastAccessed
    );
    let freedSpace = 0;
    let removedCount = 0;

    // 计算需要释放的空间/条目数
    const needFreeSize = isOverMemory
      ? Math.max(
          neededSpace,
          this.currentMemorySize + neededSpace - this.maxMemorySize
        )
      : 0;
    const needFreeCount = isOverSize ? this.cache.size - this.maxSize + 1 : 0;
    // 边筛选边淘汰，一次循环完成
    for (const [key, item] of sortedEntries) {
      // 检查是否已满足释放需求

      if (
        (needFreeCount > 0 && removedCount >= needFreeCount) ||
        (needFreeSize > 0 && freedSpace >= needFreeSize)
      )
        break; //满足需求则退出
      // 执行淘汰
      this.currentMemorySize -= item.size;
      this.cache.delete(key);
      // 更新统计
      freedSpace += item.size;
      removedCount++;
    }
    this.stats.evictions += removedCount;
    this.updateStats();
  }

  /** 估算对象内存占用(字节) */
  private estimateSize(obj: any): number {
    const cache = new WeakMap<object, number>();

    const calc = (value: any): number => {
      if (value == null) return 0;

      switch (typeof value) {
        case "number":
          return 8;
        case "string":
          return Buffer.byteLength(value, "utf8");
        case "boolean":
          return 4;
        case "bigint":
          return 8;
        case "symbol":
          return 8;
        case "function":
          return 32;
        case "object": {
          if (cache.has(value)) return cache.get(value)!;
          cache.set(value, 0); // 防止循环引用

          let size = 24; // 基础对象开销
          if (Array.isArray(value)) {
            size += value.reduce(
              (sum: number, item: any) => sum + calc(item),
              0
            );
          } else if (value instanceof Date) {
            size = 8;
          } else if (value instanceof Map || value instanceof Set) {
            size += Array.from(value.entries()).reduce(
              (sum, [k, v]) => sum + calc(k) + calc(v),
              0
            );
          } else {
            size += Object.keys(value).reduce(
              (sum, key) => sum + Buffer.byteLength(key) + calc(value[key]),
              0
            );
          }

          cache.set(value, size);
          return size;
        }
        default:
          return 16;
      }
    };

    return calc(obj);
  }

  /** 更新统计信息 */
  private updateStats(): void {
    this.stats.size = this.cache.size;
    this.stats.memorySize = this.currentMemorySize;
  }

  /** 获取缓存项 */
  get(key: string): T | undefined {
    const now = Date.now();
    const item = this.cache.get(key);

    if (!item) {
      this.stats.misses++;
      this.updateStats();
      return undefined;
    }

    // 检查过期
    if (item.expiresAt && item.expiresAt < now) {
      this.currentMemorySize -= item.size;
      this.cache.delete(key);
      this.stats.misses++;
      this.updateStats();
      return undefined;
    }

    // LRU策略：更新访问信息并调整顺序(删除后重新插入)
    item.lastAccessed = now;
    item.accessCount++;
    this.cache.delete(key);
    this.cache.set(key, item);

    this.stats.hits++;
    this.updateStats();
    return item.value;
  }

  /** 批量获取缓存项 */
  mget(keys: string[]): Record<string, T | undefined> {
    const result: Record<string, T | undefined> = {};
    const now = Date.now();

    keys.forEach((key) => {
      const item = this.cache.get(key);

      if (!item) {
        result[key] = undefined;
        this.stats.misses++;
        return;
      }

      // 处理过期
      if (item.expiresAt && item.expiresAt < now) {
        this.currentMemorySize -= item.size;
        this.cache.delete(key);
        result[key] = undefined;
        this.stats.misses++;
        return;
      }

      // 更新LRU顺序
      item.lastAccessed = now;
      item.accessCount++;
      this.cache.delete(key);
      this.cache.set(key, item);

      result[key] = item.value;
      this.stats.hits++;
    });

    this.updateStats();
    return result;
  }

  /** 设置缓存项 */
  set(key: string, value: T, ttl?: number): boolean {
    return this.mset([{ key, value, ttl }]) === 1;
  }

  /** 批量设置缓存项 */
  mset(entries: { key: string; value: T; ttl?: number }[]): number {
    if (entries.length === 0) return 0;

    const now = Date.now();
    let success = 0;
    const items: [string, CacheItem<T>][] = [];
    let totalNewSize = 0;

    // 预处理条目(计算大小、检查有效性)
    entries.forEach(({ key, value, ttl }) => {
      const size = this.estimateSize(value);
      // 单个条目超过内存限制则跳过
      if (this.maxMemorySize > 0 && size > this.maxMemorySize) return;

      const existing = this.cache.get(key);
      const netSize = existing ? size - existing.size : size; // 净新增大小
      totalNewSize += netSize;

      items.push([
        key,
        {
          value,
          size,
          createdAt: now,
          expiresAt: ttl ? now + ttl : undefined,
          lastAccessed: now,
          accessCount: existing ? existing.accessCount + 1 : 1,
        },
      ]);
    });

    // 检查是否需要淘汰
    this.evictItems(totalNewSize);

    // 验证是否有足够空间
    const overSize = this.cache.size + items.length > this.maxSize;
    const overMemory =
      this.maxMemorySize > 0 &&
      this.currentMemorySize + totalNewSize > this.maxMemorySize;
    if (overSize || overMemory) return 0;

    // 执行设置
    items.forEach(([key, item]) => {
      const existing = this.cache.get(key);
      if (existing) this.currentMemorySize -= existing.size;

      this.cache.set(key, item);
      this.currentMemorySize += item.size;
      success++;
    });

    this.updateStats();
    return success;
  }

  /** 获取或设置缓存项 */
  async getOrSet(
    key: string,
    factory: () => T | Promise<T>,
    ttl?: number
  ): Promise<T> {
    const value = this.get(key);
    if (value !== undefined) return value;

    const newValue = await factory();
    this.set(key, newValue, ttl);
    return newValue;
  }

  /** 删除缓存项 */
  delete(key: string): boolean {
    return this.deleteMany([key]) > 0;
  }

  /** 批量删除缓存项 */
  deleteMany(keys: string[]): number {
    let deleted = 0;
    keys.forEach((key) => {
      const item = this.cache.get(key);
      if (item) {
        this.currentMemorySize -= item.size;
        this.cache.delete(key);
        deleted++;
      }
    });
    this.updateStats();
    return deleted;
  }

  /** 清空缓存 */
  clear(): void {
    this.cache.clear();
    this.currentMemorySize = 0;
    this.stats = {
      ...this.stats,
      hits: 0,
      misses: 0,
      evictions: 0,
      size: 0,
      memorySize: 0,
    };
  }

  /** 检查缓存项是否存在且未过期 */
  has(key: string): boolean {
    const now = Date.now();
    const item = this.cache.get(key);

    if (!item) return false;
    if (item.expiresAt && item.expiresAt < now) {
      this.currentMemorySize -= item.size;
      this.cache.delete(key);
      this.updateStats();
      return false;
    }
    return true;
  }

  /** 获取所有缓存键 */
  keys(): string[] {
    this.cleanupExpiredItems();
    return Array.from(this.cache.keys());
  }

  /** 获取统计信息 */
  getStats(): Readonly<CacheStats> {
    return { ...this.stats };
  }

  /** 重置统计信息 */
  resetStats(): void {
    this.stats = { ...this.stats, hits: 0, misses: 0, evictions: 0 };
  }

  /** 关闭缓存释放资源 */
  close(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
  }
}

export default ACache;
