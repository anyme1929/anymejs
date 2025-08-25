import { EventEmitter } from "node:events";
import type { Request, Response } from "express";

/**
 * SSE选项配置接口
 * 定义了创建SSE实例时可配置的参数
 */
export interface SSEOptions {
  // 是否序列化初始数据
  isSerialized?: boolean;
  // 是否启用压缩
  isCompressed?: boolean;
  // 初始事件的名称
  initialEvent?: string;
  // 心跳检测
  heartbeat?: number;
  // 允许的源
  origin?: string | string[];
}

/**
 * SSE数据结构接口
 * 定义了发送到客户端的数据格式
 */
export interface SSEData {
  // 要发送的实际数据
  data: unknown;
  // 事件名称（可选）
  event?: string;
  // 事件ID（可选）
  id?: string | number;
}

/**
 * Server-Sent Event实例类
 * 继承自EventEmitter，用于处理服务器向客户端的单向实时通信
 */
export class SSE extends EventEmitter {
  // 初始数据数组，新连接建立时会发送这些数据
  private initial: unknown[];
  // SSE配置选项
  private options: SSEOptions;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  /**
   * 创建一个新的Server-Sent Event实例
   * @param initial 初始数据，可以是单个值或数组
   * @param options SSE配置选项
   */
  constructor(initial?: unknown | unknown[], options?: SSEOptions) {
    super();
    // 处理初始数据，如果是数组则直接使用，否则包装成数组
    this.initial = initial
      ? Array.isArray(initial)
        ? initial
        : [initial]
      : [];
    // 合并默认配置和用户配置
    this.options = {
      heartbeat: 0,
      isSerialized: true,
      ...options,
    };

    // 绑定init方法的this上下文，确保在Express中使用时this指向正确
    this.init = this.init.bind(this);
  }

  /**
   * Express路由处理器，用于初始化SSE连接
   * @param req Express请求对象
   * @param res Express响应对象
   */
  init(req: Request, res: Response): void {
    // 事件ID计数器，用于自动生成事件ID
    let id = 0;
    // 设置响应头，指定内容类型为text/event-stream
    this.setup(req, res);
    this.emit("connect", req, res);
    // 增加事件监听器的最大数量，避免连接过多时警告
    this.setMaxListeners(this.getMaxListeners() + 2);
    const { dataListener, serializeListener } = this.createListeners(res, {
      get: () => id,
      update: (newId) => (id = newId),
    });
    // 注册事件监听器
    this.on("data", dataListener);
    this.on("serialize", serializeListener);
    // 发送初始数据
    if (this.initial.length > 0) {
      if (this.options.isSerialized)
        this.serialize(this.initial); // 如果启用序列化，批量发送初始数据
      else
        this.initial.forEach((item) =>
          this.send(item, this.options.initialEvent)
        ); // 否则逐个发送初始数据
    }
    this.setupHeartbeat(res);
    const cleanup = () => {
      this.clearHeartbeat();
      this.removeListener("data", dataListener);
      this.removeListener("serialize", serializeListener);
      // 确保最大监听器数量不会小于0
      this.setMaxListeners(Math.max(0, this.getMaxListeners() - 2));
      // 触发close事件，通知外部连接已关闭
      this.emit("close", req, res);
    };
    // 注册连接关闭相关的事件处理
    req.on("close", cleanup); // 客户端断开连接
    req.on("end", cleanup); // 请求结束
    res.on("finish", cleanup); // 响应完成
  }

  /**
   * 监听器创建：生成当前连接的专属监听器
   * 每个连接对应独立的监听器，避免多连接间状态冲突（如eventId）
   * @param res Express响应对象
   * @param idController ID控制器（获取/更新当前连接的eventId）
   * @returns 当前连接的专属监听器（dataListener + serializeListener）
   */
  private createListeners(
    res: Response,
    idController: {
      get: () => number;
      update: (newId: number) => void;
    }
  ) {
    /**
     * 单条数据监听器：处理send方法触发的"数据"事件
     * 负责将单条数据格式化为SSE协议格式并发送
     */
    const dataListener = (payload: SSEData) => {
      // 连接已关闭：移除监听器并退出
      if (!res.writable) {
        this.removeListener("data", dataListener);
        return;
      }
      const id = idController.get();
      // 1. 写入事件ID（优先使用自定义ID，无则用自动生成ID）
      if (payload.id) res.write(`id: ${payload.id}\n`);
      else {
        res.write(`id: ${id}\n`);
        idController.update(id + 1); // 更新ID（下一条数据自增）
      }

      // 2. 写入事件名称（可选）
      if (payload.event) res.write(`event: ${payload.event}\n`);

      // 3. 写入数据（字符串直接用，非字符串转为JSON）
      const dataStr =
        typeof payload.data === "string"
          ? payload.data
          : JSON.stringify(payload.data);
      res.write(`data: ${dataStr}\n\n`); // SSE协议：数据结尾需空行

      // 4. 强制刷新响应（确保数据即时发送到客户端）
      this.flush(res);
    };

    /**
     * 序列化监听器：处理serialize方法触发的"序列化"事件
     * 负责将数组数据批量格式化为SSE协议格式并发送
     */
    const serializeListener = (dataArray: unknown[]) => {
      // 连接已关闭：移除监听器并退出
      if (!res.writable) {
        this.removeListener("serialize", serializeListener);
        return;
      }

      let id = idController.get();
      // 1. 批量序列化数组数据（转为SSE协议格式字符串）
      const serializedData = dataArray.reduce((acc, item) => {
        const dataStr = typeof item === "string" ? item : JSON.stringify(item);
        acc += `id: ${id}\ndata: ${dataStr}\n\n`;
        id++; // 每条数据ID自增
        return acc;
      }, "");

      // 2. 发送批量数据
      res.write(serializedData);
      // 3. 更新ID（批量发送后同步ID计数器）
      idController.update(id);
      // 4. 强制刷新响应
      this.flush(res);
    };
    return { dataListener, serializeListener };
  }
  private setup(req: Request, res: Response) {
    const vary: string[] = [];
    // 配置Socket选项
    // 禁用超时，保持长连接
    req.socket.setTimeout(0);
    // 禁用Nagle算法，确保数据立即发送
    req.socket.setNoDelay(true);
    // 启用TCP保活机制
    req.socket.setKeepAlive(true);
    // 设置响应状态码和头部
    res.statusCode = 200;
    if (this.options.origin) {
      vary.push("Origin");
      if (Array.isArray(this.options.origin)) {
        if (this.options.origin.includes(req.headers.origin!))
          res.setHeader("Access-Control-Allow-Origin", req.headers.origin!);
      } else if (typeof this.options.origin === "string")
        res.setHeader("Access-Control-Allow-Origin", this.options.origin);
    }
    // 告知客户端这是一个SSE流
    res.setHeader("Content-Type", "text/event-stream");
    // 禁用缓存
    res.setHeader("Cache-Control", "no-cache");
    // 禁用反向代理缓冲
    res.setHeader("X-Accel-Buffering", "no");
    // HTTP/1.1需要设置Connection: keep-alive
    if (req.httpVersion !== "2.0") res.setHeader("Connection", "keep-alive");
    // 如果启用压缩，设置相应的头部
    if (this.options.isCompressed) {
      res.setHeader("Content-Encoding", "deflate");
      vary.push("Accept-Encoding");
    }
    if (vary.length > 0) res.setHeader("Vary", vary.join(", "));
  }
  private flush(res: Response) {
    if (typeof (res as any).flushHeaders === "function")
      (res as any).flushHeaders();
    else if (typeof (res as any).flush === "function") (res as any).flush();
  }
  private setupHeartbeat(res: Response) {
    if (this.options.heartbeat === 0) return;
    this.heartbeatInterval = setInterval(() => {
      if (res.writable) {
        res.write(": heartbeat\n\n");
        this.flush(res);
      } else this.clearHeartbeat();
    }, this.options.heartbeat);
  }

  private clearHeartbeat() {
    if (!this.heartbeatInterval) return;
    clearInterval(this.heartbeatInterval);
    this.heartbeatInterval = null;
  }
  /**
   * 更新SSE流的初始数据
   * 新的连接建立时会发送这些数据
   * @param data 要设置的初始数据，可以是单个值或数组
   */
  updateInit(data: unknown | unknown[]): void {
    this.initial = Array.isArray(data) ? data : [data];
  }

  /**
   * 清空SSE流的初始数据
   * 后续新连接将不会收到初始数据
   */
  dropInit(): void {
    this.initial = [];
  }

  /**
   * 向所有连接的客户端发送数据
   * @param data 要发送的数据
   * @param event 事件名称（可选）
   * @param id 事件ID（可选）
   */
  send(data: unknown, event?: string, id?: string | number): void {
    this.emit("data", { data, event, id });
  }

  /**
   * 向所有连接的客户端发送序列化数据（批量发送数组）
   * @param data 要序列化发送的数组
   */
  serialize(data: unknown[] | unknown): void {
    if (!Array.isArray(data)) this.send(data);
    else this.emit("serialize", data);
  }
}

export default SSE;
