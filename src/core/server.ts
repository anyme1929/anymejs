import {
  useExpressServer,
  type RoutingControllersOptions,
  useContainer,
} from "routing-controllers";
import { createServer as createHttps } from "node:https";
import { createServer as createHttp } from "node:http";
import { resolve, isAbsolute } from "node:path";
import { readFile } from "node:fs/promises";
import type {
  Application,
  IocAdapter,
  IServer,
  IConfig,
  ICreateServer,
  Logger,
} from "../types";
export default class CreateServer implements ICreateServer {
  private app: Application | null = null;
  private server: IServer | null = null;
  private pending: Promise<IServer> | null = null;
  constructor(iocAdapter: IocAdapter, private readonly logger: Logger) {
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
  async bootstrap(port: number, options: IConfig["https"]): Promise<IServer> {
    if (!this.app) throw new Error("Server not initialized");
    if (this.pending) return this.pending;
    this.pending = new Promise<IServer>((res, rej) => {
      if (this.server?.listening) throw new Error("Server already running");
      this.createServer(options).then(({ ssl, server }) => {
        this.server = server
          .listen(ssl ? options.ssl.port : port, () => {
            res(this.server!);
            this.logger.info(
              `🚀 Server running on ${ssl ? "https" : "http"}://localhost:${
                ssl ? 443 : port
              }`
            );
          })
          .on("error", (error) => rej(error));
        this.pending = null;
      });
    });
    return this.pending;
  }
  private async createServer(options: IConfig["https"]) {
    if (options.enable) {
      const keyPath = isAbsolute(options.ssl.key)
        ? options.ssl.key
        : resolve(options.ssl.key);
      const certPath = isAbsolute(options.ssl.cert)
        ? options.ssl.cert
        : resolve(options.ssl.cert);
      const [key, cert] = await Promise.allSettled([
        readFile(keyPath),
        readFile(certPath),
      ]);
      if (key.status === "fulfilled" && cert.status === "fulfilled") {
        const ssl = {
          key: key.value,
          cert: cert.value,
        };
        return {
          server: createHttps(ssl, this.app!),
          ssl: true,
        };
      }
    }
    return {
      server: createHttp(this.app!),
      ssl: false,
    };
  }
}
