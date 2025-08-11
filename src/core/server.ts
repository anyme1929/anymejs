import {
  useExpressServer,
  type RoutingControllersOptions,
  useContainer,
} from "routing-controllers";
import {
  type Application,
  type IocAdapter,
  type Server,
  ICreateServer,
} from "../types";
export default class CreateServer implements ICreateServer {
  private app: Application | null = null;
  private server: Server | null = null;
  private pending: Promise<Server> | null = null;
  constructor(iocAdapter: IocAdapter) {
    useContainer(iocAdapter);
  }
  init(app: Application, config: RoutingControllersOptions) {
    if (this.app) return this;
    this.app = useExpressServer(app, config);
    return this;
  }
  /**
   * 启动服务器
   * @param port 服务器监听的端口号
   * @returns 服务器实例的Promise
   */
  async bootstrap(port: number): Promise<Server> {
    if (!this.app) throw new Error("Server not initialized");
    if (this.pending) return this.pending;
    this.pending = new Promise<Server>((resolve, reject) => {
      if (this.server?.listening) throw new Error("Server already running");
      this.server = this.app!.listen(port, (error) => {
        if (error) reject(error);
        else resolve(this.server!);
        this.pending = null;
      });
    });
    return this.pending;
  }
  /**
   * 关闭服务器
   * @returns 关闭完成的Promise
   */
  async close(): Promise<void> {
    if (this.pending) await this.pending;
    if (!this.server?.listening) return;
    return new Promise((resolve, reject) => {
      this.server!.close((error) => {
        if (error) reject(error);
        else {
          this.server = null;
          resolve();
        }
      });
    });
  }
}
