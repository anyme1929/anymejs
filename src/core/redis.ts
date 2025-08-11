import { Redis } from "ioredis";
import { IConfig } from "../types";
let instance: Redis | null = null;
export default (config: IConfig["redis"]) => {
  const { enable, client } = config;
  if (!enable) return;
  if (instance) return instance;
  instance = new Redis(client);
  return instance;
};
// 连接状态监听
// redis.on("connect", () => {
//   logger.info("已连接到 Redis");
// });

// redis.on("ready", () => {
//   logger.info("Redis 连接就绪并可使用");
// });

// redis.on("error", (err) => {
//   logger.error("Redis 连接错误:", err);
// });

// redis.on("close", () => {
//   logger.info("Redis 连接已关闭");
// });

// redis.on("reconnecting", () => {
//   logger.info("正在重连到 Redis...");
// });
