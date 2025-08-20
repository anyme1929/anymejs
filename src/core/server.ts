import { useExpressServer, useContainer } from "routing-controllers";
import { createServer as createHttps } from "node:https";
import { createServer as createHttp } from "node:http";
import { readFileSync } from "node:fs";
import { getAbsolutePath } from "../utils";
import type {
  Application,
  IocAdapter,
  IServer,
  IConfig,
  ICreateServer,
  Logger,
} from "../types";
export default class CreateServer implements ICreateServer {
  private isInitialized: boolean = false;
  private app: Application | null = null;
  private config: IConfig["server"] | null = null;
  private server: IServer | null = null;
  private pending: Promise<IServer> | null = null;
  constructor(iocAdapter: IocAdapter, private readonly logger: Logger) {
    useContainer(iocAdapter);
  }
  init(app: Application, config: IConfig["server"]) {
    if (this.isInitialized) return this;
    this.config = config;
    this.setProxy(app);
    this.app = useExpressServer(app, config!.route);
    this.isInitialized = true;
    return this;
  }
  /**
   * 启动服务器
   * @param port 服务器监听的端口号
   * @returns 服务器实例的Promise
   */
  async bootstrap(port?: number): Promise<IServer> {
    if (!this.isInitialized) throw new Error("Server not initialized");
    if (this.pending) return this.pending;
    const { https, port: httpPort } = this.config!;
    this.pending = new Promise<IServer>((res, rej) => {
      if (this.server?.listening) return rej("Server already running");
      this.createServer(this.app!).then(({ ssl, server }) => {
        const scheme = ssl ? "https" : "http";
        port = port ?? (ssl ? https.port : httpPort);
        this.server = server
          .listen(port, () => {
            res(this.server!);
            this.logger.info(
              `🚀 Server running on ${scheme}://localhost:${port}`
            );
          })
          .on("error", (error) => rej(error));
        this.pending = null;
      });
    });
    return this.pending;
  }
  private async createServer(app: Application) {
    const { ssl, enable } = this.config!.https;
    if (!enable)
      return {
        server: createHttp(app),
        ssl: false,
      };
    // 读取 SSL 证书和密钥
    const [key, cert] = await Promise.all([
      this.readFile(ssl.key),
      this.readFile(ssl.cert),
    ]);

    if (!key || !cert) {
      this.logger.warn("SSL key or certificate not found");
      return { server: createHttp(app), ssl: false };
    }
    let ca: Buffer[] | undefined;
    if (ssl.requestCert && ssl.ca?.length) {
      ca = (await Promise.allSettled(ssl.ca.map(this.readFile)))
        .filter(
          (p): p is PromiseFulfilledResult<Buffer> => p.status === "fulfilled"
        )
        .map((p) => p.value);
      if (!ca.length) this.logger.warn("SSL CA certificates not found");
    }
    return {
      server: createHttps(
        {
          ...ssl,
          key,
          cert,
          ca: ca?.length ? ca : undefined,
        },
        app
      ),
      ssl: true,
    };
  }

  private async readFile(path: string): Promise<Buffer | null> {
    try {
      return readFileSync(getAbsolutePath(path));
    } catch {
      return null;
    }
  }
  private async setProxy(app: Application) {
    const { proxy } = this.config!;
    if (proxy) app.set("trust proxy", proxy);
  }
}
