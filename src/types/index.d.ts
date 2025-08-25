import type { IConfig, ConfigArgs } from "./interfaces";
export * from "./interfaces";

export type DeepPartial<T> = T extends object // 仅处理对象类型（数组会被视作对象，但其索引签名会被保留）
  ? // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    T extends Function | any[] // 如果是函数类型，保持原样
    ? T
    : { [K in keyof T]?: DeepPartial<T[K]> } // 递归处理对象的每个属性
  : T;
export type UserConfig = DeepPartial<IConfig>;
declare type UserConfigCallback = (ctx: ConfigArgs) => UserConfig;
export type ConfigOptions = UserConfig | UserConfigCallback;
