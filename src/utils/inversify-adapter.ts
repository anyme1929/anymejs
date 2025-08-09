import { IocAdapter, ClassConstructor, Action } from "routing-controllers";
import { Container } from "inversify";
import { SYMBOLS } from "../types";
export default class InversifyAdapter implements IocAdapter {
  constructor(private readonly container: Container) {}
  get<T>(someClass: ClassConstructor<T>, action?: Action): T {
    const child = new Container({ parent: this.container });
    child.bind(SYMBOLS.ClientIp).toConstantValue(action?.context.ip);
    return child.get<T>(someClass);
  }
}
