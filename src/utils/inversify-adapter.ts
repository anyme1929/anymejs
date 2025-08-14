import { IocAdapter, ClassConstructor, Action } from "routing-controllers";
import { Container } from "inversify";
export default class InversifyAdapter implements IocAdapter {
  constructor(private readonly container: Container) {}
  get<T>(someClass: ClassConstructor<T>, action?: Action): T {
    const child = new Container({
      parent: this.container,
      defaultScope: "Request",
    });
    child.bind(someClass).toSelf();
    return child.get<T>(someClass);
  }
}
