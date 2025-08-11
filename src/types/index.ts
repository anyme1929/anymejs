export { type DataSource } from "typeorm";
export { type Redis } from "ioredis";
export { type Logger } from "winston";
export { type Server } from "node:http";
export { type HealthCheckMap } from "@godaddy/terminus";
export { type Application, type RequestHandler } from "express";
export { type SessionOptions } from "express-session";
export { type IocAdapter } from "routing-controllers";
export * from "./constants";
export * from "./interfaces";
import { IConfig } from "./interfaces";
export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};
export type userConfig = DeepPartial<IConfig>;
