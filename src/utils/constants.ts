/**
 * 依赖注入类型符号常量
 * 用于标识不同服务的注入令牌
 */
export const SYMBOLS = {
  App: Symbol.for("App"),
  Config: Symbol.for("Config"),
  DataSource: Symbol.for("DataSource"),
  Redis: Symbol.for("Redis"),
  Logger: Symbol.for("Logger"),
  GracefulExit: Symbol.for("GracefulExit"),
  CreateSession: Symbol.for("CreateSession"),
  CreateServer: Symbol.for("CreateServer"),
  ClientIp: Symbol.for("ClientIp"),
  IocAdapter: Symbol.for("IocAdapter"),
};
export const IV_LENGTH = 16;
export const ENC_DEFAULT_KEY = "default-anymejs-unsafe-key";
