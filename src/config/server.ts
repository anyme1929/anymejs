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
  private server: Server | null = null;
  private pending: Promise<Server> | null = null;
  constructor(
    config: RoutingControllersOptions,
    iocAdapter: IocAdapter,
    private app: Application
  ) {
    useContainer(iocAdapter);
    this.app = useExpressServer(app, config);
  }
  async bootstrap(port: number): Promise<Server> {
    if (this.pending) return this.pending;
    this.pending = new Promise<Server>((resolve, reject) => {
      if (this.server?.listening) throw new Error("Server already running");
      this.server = this.app.listen(port, (error) => {
        if (error) reject(error);
        else resolve(this.server!);
        this.pending = null;
      });
    });
    return this.pending;
  }
  /**
   * 关闭服务器（可选实现，用于优雅退出）
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
