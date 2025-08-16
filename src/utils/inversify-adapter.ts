import { IocAdapter, ClassConstructor, Action } from "routing-controllers";
import { Container } from "inversify";

export default class InversifyAdapter implements IocAdapter {
  private child: Container;
  constructor(readonly container: Container) {
    this.child = new Container({
      parent: container,
      autobind: true,
      defaultScope: "Request",
    });
  }
  get<T>(someClass: ClassConstructor<T>, _action?: Action): T {
    return this.child.get<T>(someClass);
  }
}
