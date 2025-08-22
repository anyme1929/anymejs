import type { IConfig, CtxArgs } from "./interfaces";
export type { EntityTarget, ObjectLiteral, DataSourceOptions } from "typeorm";
export type { Logger } from "winston";
export type { Application, RequestHandler } from "express";
export type { SessionOptions } from "express-session";
export type { IocAdapter } from "routing-controllers";
export * from "./interfaces";
export type DeepPartial<T> = T extends (infer U)[]
  ? DeepPartial<U>[]
  : T extends object
  ? { [K in keyof T]?: DeepPartial<T[K]> }
  : T;
export type UserConfig = DeepPartial<IConfig>;
declare type UserConfigCallback = (ctx: CtxArgs) => UserConfig;
export type ConfigOptions = UserConfig | UserConfigCallback;
