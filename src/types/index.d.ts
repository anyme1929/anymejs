import type { IConfig, CtxArgs } from "./interfaces";
export {
  type DataSource,
  type EntityTarget,
  type ObjectLiteral,
} from "typeorm";
export { type Redis } from "ioredis";
export { type Logger } from "winston";
export { type Application, type RequestHandler, type Express } from "express";
export { type SessionOptions } from "express-session";
export {
  type IocAdapter,
  type RoutingControllersOptions,
} from "routing-controllers";
export { type Provider } from "inversify";
export * from "./interfaces";
export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};
export type UserConfig = DeepPartial<IConfig>;
declare type UserConfigCallback = (ctx: CtxArgs) => UserConfig;
export type ConfigOptions = UserConfig | UserConfigCallback;
