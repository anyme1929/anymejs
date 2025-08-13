import { createTerminus } from "@godaddy/terminus";
import type { Logger, HealthCheckMap, IGracefulExit, Server } from "../types";
export default class GracefulExit implements IGracefulExit {
  private isRegistered: boolean = false;
  private isShuttingDown = false;
  private readonly cleanupTasks: Set<() => Promise<void>> = new Set();
  constructor(private logger: Logger) {}
  /**
   * 为HTTP服务器设置优雅退出
   * @param server HTTP服务器实例
   * @param logger 日志记录器
   */
  register(
    server: Server,
    options?: {
      timeout?: number;
      signals?: NodeJS.Signals[];
      healthCheck?: HealthCheckMap;
    }
  ): GracefulExit {
    if (this.isRegistered) return this;
    if (!server.listening) throw new Error("Server Not Listening");
    this.isRegistered = true;
    this.setupProcessHandlers();
    /**
     * 创建优雅退出配置
     * @param server - 要配置的HTTP服务器实例
     * @param options - 配置选项 {
     *   timeout: 清理超时时间（默认30000ms）,
     *   signals: 监听的系统信号（默认SIGINT/SIGTERM）
     * }
     */
    createTerminus(server, {
      logger: (msg: string, err: Error) => {
        if (err) this.logger.error(msg, err);
        if (msg) this.logger.info(msg);
      },
      timeout: options?.timeout || 30000, // 清理超时时间（默认30秒）
      signals: options?.signals || ["SIGINT", "SIGTERM"], // 监听的系统信号
      healthChecks: options?.healthCheck || {}, // 使用之前添加的健康检查端点
      onSignal: async () => {
        // 收到终止信号时的处理
        if (this.isShuttingDown) return;
        this.isShuttingDown = true;
        this.logger.info("🚦 Received termination signal");
        await this.cleanup();
      }, // 关闭完成回调
    });
    return this;
  }
  /**
   * 添加资源关闭任务
   * @param task 返回Promise的资源关闭函数
   */
  addCleanupTask(...task: (() => Promise<void>)[]) {
    task.forEach((i) => this.cleanupTasks.add(i));
  }

  /**
   * 执行所有清理任务
   */
  private async cleanup() {
    if (this.cleanupTasks.size === 0) return;
    await Promise.all([...this.cleanupTasks].map((task) => task()));
    this.cleanupTasks.clear();
    this.logger.info("✅ All resources closed").end();
  }

  /**
   * 设置进程信号处理器
   */
  private setupProcessHandlers() {
    // 未捕获异常
    process.on("uncaughtException", (err: Error) =>
      this.handleSignal("❌ Uncaught Exception:", err)
    );
    // 未处理的Promise拒绝
    process.on("unhandledRejection", (err: Error) =>
      this.handleSignal("⚠️ Unhandled Rejection:", err)
    );
  }
  private async handleSignal(msg: string, err: Error) {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;
    this.logger.error(msg, err);
    await this.cleanup();
  }
}
