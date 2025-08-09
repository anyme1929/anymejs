import {
  Application,
  RequestHandler,
  IGlobalMiddlewares,
  IHandler,
} from "../types";
import { isEmpty } from ".";
export default class GlobalMiddlewares implements IGlobalMiddlewares {
  private anonymous = "<anonymous>";
  private app: Application | null = null;
  // 新增：存储中间件信息
  private middlewareList: Map<string, RequestHandler | RequestHandler[]> =
    new Map();
  init(this: GlobalMiddlewares, app: Application): GlobalMiddlewares {
    if (this.app) return this;
    this.app = app;
    return this;
  }
  register(...handlers: (IHandler | RequestHandler)[]) {
    this.validate(handlers);
    this.addBatch(this.formatHandlers(...handlers));
  }
  private validate<T>(handlers: T): void {
    if (isEmpty(handlers))
      throw new Error("Middleware handlers cannot be empty");
    if (!this.app) {
      throw new Error(
        "GlobalMiddlewares must be initialized with an Express app instance"
      );
    }
  }
  private formatHandlers(
    ...handlers: (IHandler | RequestHandler)[]
  ): IHandler[] {
    return handlers.map((h) => {
      return this.isIHandler(h)
        ? h
        : { name: h.name || this.anonymous, handle: h };
    });
  }
  private isIHandler(item: unknown): item is IHandler {
    if (!item || typeof item !== "object") return false;
    return "name" in item && "handle" in item;
  }
  private exists(handler: IHandler) {
    if (handler.name === this.anonymous) return false;
    return this.middlewareList.has(handler.name) ||
      this.middlewareList.has(handler.handle.name)
      ? handler.name
      : false;
  }
  private addBatch(items: IHandler[]) {
    const name = new Set<string>();
    const handles = items.filter((i) => {
      const exists = this.exists(i);
      if (exists) name.add(exists);
      else {
        if (i.name === this.anonymous) this.setAnonymous(i.handle);
        else this.middlewareList.set(i.name, i.handle);
      }
      return !exists;
    });
    if (name.size > 0)
      throw new Error(
        `[${[...name].join(", ")}] middleware already registered`
      );
    if (handles.length > 0) this.app!.use(handles.map((i) => i.handle));
  }
  private setAnonymous(handle: RequestHandler) {
    const anonymous = this.middlewareList.get(this.anonymous);
    if (Array.isArray(anonymous)) anonymous.push(handle);
    else this.middlewareList.set(this.anonymous, [handle]);
  }
  get routers(): Map<string, RequestHandler | RequestHandler[]> {
    return this.middlewareList;
  }
}
