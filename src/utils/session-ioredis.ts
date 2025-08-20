// 导入 express-session 中的 SessionData 类型和 Store 类
import { type SessionData, Store } from "express-session";
// 导入 ioredis 库
import type { Redis, Cluster } from "../types";

// 定义回调函数类型，可接受错误信息和数据作为参数
type Callback = (_err?: unknown, _data?: any) => any;

/**
 * 可选的回调函数处理函数，若提供了回调函数则执行，否则在出错时抛出错误
 * @param err - 错误信息
 * @param data - 数据
 * @param cb - 可选的回调函数
 * @returns 若提供了回调函数则返回其执行结果，否则返回数据
 */
function optionalCb(err: unknown, data: unknown, cb?: Callback) {
  if (cb) return cb(err, data);
  if (err) throw err;
  return data;
}

/**
 * 序列化器接口，定义了解析和字符串化 SessionData 的方法
 */
interface Serializer {
  // 解析字符串为 SessionData 或返回一个解析为 SessionData 的 Promise
  parse(s: string): SessionData | Promise<SessionData>;
  // 将 SessionData 字符串化
  stringify(s: SessionData): string;
}

/**
 * RedisStore 的配置选项接口
 */
interface RedisStoreOptions {
  // Redis 客户端实例
  client: Redis | Cluster;
  // 键的前缀，默认为 "sess:"
  prefix?: string;
  // 每次扫描的键数量，默认为 100
  scanCount?: number;
  // 序列化器，默认为 JSON
  serializer?: Serializer;
  // 会话的生存时间，单位为秒，也可以是一个根据会话数据返回生存时间的函数
  ttl?: number | ((sess: SessionData) => number);
  // 是否禁用 TTL，默认为 false
  disableTTL?: boolean;
  // 是否禁用 touch 操作，默认为 false
  disableTouch?: boolean;
}

/**
 * RedisStore 类，继承自 express-session 的 Store 类，用于将会话数据存储到 Redis 中
 */
export default class RedisStore extends Store {
  // Redis 客户端实例
  client: Redis | Cluster;
  // 键的前缀
  prefix: string;
  // 每次扫描的键数量
  scanCount: number;
  // 序列化器
  serializer: Serializer;
  // 会话的生存时间
  ttl: number | ((sess: SessionData) => number);
  // 是否禁用 TTL
  disableTTL: boolean;
  // 是否禁用 touch 操作
  disableTouch: boolean;

  /**
   * 构造函数，初始化 RedisStore 实例
   * @param opts - RedisStore 的配置选项
   */
  constructor(opts: RedisStoreOptions) {
    super();
    // 若未提供前缀，则使用默认值 "sess:"
    this.prefix = opts.prefix == null ? "sess:" : opts.prefix;
    // 若未提供扫描数量，则使用默认值 100
    this.scanCount = opts.scanCount || 100;
    // 若未提供序列化器，则使用 JSON
    this.serializer = opts.serializer || JSON;
    // 若未提供 TTL，则使用默认值 86400 秒（一天）
    this.ttl = opts.ttl || 86400;
    // 若未提供 disableTTL，则使用默认值 false
    this.disableTTL = opts.disableTTL || false;
    // 若未提供 disableTouch，则使用默认值 false
    this.disableTouch = opts.disableTouch || false;
    // Redis 客户端实例
    this.client = opts.client;
  }

  /**
   * 根据会话 ID 获取会话数据
   * @param sid - 会话 ID
   * @param cb - 可选的回调函数
   */
  async get(sid: string, cb?: Callback) {
    // 生成完整的 Redis 键
    const key = this.prefix + sid;
    try {
      // 从 Redis 中获取数据
      const data = await this.client.get(key);
      // 若未获取到数据，则调用 optionalCb 并返回 null
      if (!data) return optionalCb(null, null, cb);
      // 解析数据并调用 optionalCb 返回结果
      return optionalCb(null, await this.serializer.parse(data), cb);
    } catch (err) {
      // 出错时调用 optionalCb 并返回错误信息
      return optionalCb(err, null, cb);
    }
  }

  /**
   * 根据会话 ID 设置会话数据
   * @param sid - 会话 ID
   * @param sess - 会话数据
   * @param cb - 可选的回调函数
   */
  async set(sid: string, sess: SessionData, cb?: Callback) {
    // 生成完整的 Redis 键
    const key = this.prefix + sid;
    // 获取会话的 TTL
    const ttl = this.getTTL(sess);
    try {
      if (ttl > 0) {
        // 序列化会话数据
        const val = this.serializer.stringify(sess);
        if (this.disableTTL) {
          // 若禁用 TTL，则直接设置键值
          await this.client.set(key, val);
        } else {
          // 若未禁用 TTL，则设置键值并指定过期时间
          await this.client.setex(key, ttl, val);
        }
        // 调用 optionalCb 表示操作成功
        return optionalCb(null, null, cb);
      }
      // 若 TTL 小于等于 0，则销毁会话
      return this.destroy(sid, cb);
    } catch (err) {
      // 出错时调用 optionalCb 并返回错误信息
      return optionalCb(err, null, cb);
    }
  }

  /**
   * 更新会话的过期时间
   * @param sid - 会话 ID
   * @param sess - 会话数据
   * @param cb - 可选的回调函数
   */
  async touch(sid: string, sess: SessionData, cb?: Callback) {
    // 生成完整的 Redis 键
    const key = this.prefix + sid;
    // 若禁用 touch 或 TTL，则直接调用 optionalCb 表示操作成功
    if (this.disableTouch || this.disableTTL) return optionalCb(null, null, cb);
    try {
      // 更新键的过期时间
      await this.client.expire(key, this.getTTL(sess));
      // 调用 optionalCb 表示操作成功
      return optionalCb(null, null, cb);
    } catch (err) {
      // 出错时调用 optionalCb 并返回错误信息
      return optionalCb(err, null, cb);
    }
  }

  /**
   * 根据会话 ID 销毁会话
   * @param sid - 会话 ID
   * @param cb - 可选的回调函数
   */
  async destroy(sid: string, cb?: Callback) {
    // 生成完整的 Redis 键
    const key = this.prefix + sid;
    try {
      // 从 Redis 中删除键
      await this.client.del(key);
      // 调用 optionalCb 表示操作成功
      return optionalCb(null, null, cb);
    } catch (err) {
      // 出错时调用 optionalCb 并返回错误信息
      return optionalCb(err, null, cb);
    }
  }

  /**
   * 清除所有会话数据
   * @param cb - 可选的回调函数
   */
  async clear(cb?: Callback) {
    try {
      // 获取所有符合前缀的键
      const keys = await this.getAllKeys();
      // 若没有键，则调用 optionalCb 表示操作成功
      if (!keys.length) return optionalCb(null, null, cb);
      // 使用 Redis 客户端的 del 方法批量删除所有符合前缀的键
      await this.client.del(keys);
      // 调用 optionalCb 表示操作成功
      return optionalCb(null, null, cb);
    } catch (err) {
      // 出错时调用 optionalCb 并返回错误信息
      return optionalCb(err, null, cb);
    }
  }

  /**
   * 获取会话的数量
   * @param cb - 可选的回调函数
   */
  async length(cb?: Callback) {
    try {
      // 获取所有符合前缀的键
      const keys = await this.getAllKeys();
      // 调用 optionalCb 返回键的数量
      return optionalCb(null, keys.length, cb);
    } catch (err) {
      // 出错时调用 optionalCb 并返回错误信息
      return optionalCb(err, null, cb);
    }
  }

  /**
   * 获取所有会话的 ID
   * @param cb - 可选的回调函数
   */
  async ids(cb?: Callback) {
    // 前缀的长度
    const len = this.prefix.length;
    try {
      // 获取所有符合前缀的键
      const keys = await this.getAllKeys();
      // 提取键中的会话 ID 并调用 optionalCb 返回结果
      return optionalCb(
        null,
        keys.map((k) => k.substring(len)),
        cb
      );
    } catch (err) {
      // 出错时调用 optionalCb 并返回错误信息
      return optionalCb(err, null, cb);
    }
  }

  /**
   * 获取所有会话数据
   * @param cb - 可选的回调函数
   */
  async all(cb?: Callback) {
    // 前缀的长度
    const len = this.prefix.length;
    try {
      // 获取所有符合前缀的键
      const keys = await this.getAllKeys();
      // 若没有键，则调用 optionalCb 返回空数组
      if (keys.length === 0) return optionalCb(null, [], cb);

      // 批量获取所有键的值
      const data = await this.client.mget(keys);

      // 处理获取到的数据
      const results = data.reduce((acc, raw, idx) => {
        if (!raw) return acc;
        // 解析数据
        const sess = this.serializer.parse(raw) as any;
        // 添加会话 ID 到会话数据中
        sess.id = keys[idx].substring(len);
        // 将会话数据添加到结果数组中
        acc.push(sess);
        return acc;
      }, [] as SessionData[]);

      // 调用 optionalCb 返回结果数组
      return optionalCb(null, results, cb);
    } catch (err) {
      // 出错时调用 optionalCb 并返回错误信息
      return optionalCb(err, null, cb);
    }
  }

  /**
   * 获取会话的生存时间（TTL, Time To Live）
   * @param sess - 会话数据，包含会话相关的信息，如 Cookie 过期时间等
   * @returns 会话的 TTL，单位为秒
   */
  private getTTL(sess: SessionData) {
    // 检查 ttl 是否为函数类型
    // 若 ttl 是函数，则调用该函数并传入会话数据，获取动态计算的 TTL
    if (typeof this.ttl === "function") return this.ttl(sess);

    // 用于存储计算得到的 TTL
    let ttl;
    // 检查会话数据中的 Cookie 是否存在 expires 字段
    if (sess?.cookie?.expires) {
      // 将会话 Cookie 的过期时间转换为时间戳（毫秒）
      // 再减去当前时间的时间戳（毫秒），得到距离过期的剩余毫秒数
      const ms = Number(new Date(sess.cookie.expires)) - Date.now();
      // 将剩余毫秒数转换为秒，并向上取整，得到剩余秒数作为 TTL
      ttl = Math.ceil(ms / 1000);
    } else {
      // 若会话没有设置过期时间，则使用构造函数中传入的默认 TTL
      ttl = this.ttl;
    }
    // 返回计算得到的 TTL
    return ttl;
  }
  private async getAllKeys(): Promise<string[]> {
    const pattern = this.prefix + "*";
    const keys = new Set<string>();

    if (this.isCluster(this.client)) {
      // 并行扫描所有主节点以提高效率
      const nodes = this.client.nodes("master");
      const scanPromises = nodes.map((node) => this.scanNode(node, pattern));
      const results = await Promise.all(scanPromises);
      results.forEach((nodeKeys) => {
        nodeKeys.forEach((key) => keys.add(key));
      });
    } else {
      // 单节点模式
      const nodeKeys = await this.scanNode(this.client, pattern);
      nodeKeys.forEach((key) => keys.add(key));
    }
    return Array.from(keys);
  }

  /**
   * 从单个节点扫描匹配的键
   */
  private async scanNode(client: Redis, pattern: string): Promise<string[]> {
    const keys: string[] = [];
    let cursor = "0";
    do {
      const [nextCursor, matchedKeys] = await client.scan(
        Number(cursor),
        "MATCH",
        pattern,
        "COUNT",
        this.scanCount
      );
      cursor = nextCursor.toString();
      keys.push(...matchedKeys);
      // 防止无限循环的额外保护
      if (cursor === "0") break;
    } while (cursor !== "0");
    return keys;
  }
  private isCluster(client: Redis | Cluster): client is Cluster {
    return typeof (client as Cluster).nodes === "function";
  }
}
