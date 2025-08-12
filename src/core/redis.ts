import { Redis } from "ioredis";
import { IConfig, Logger } from "../types";
let instance: Redis | null = null;
export default (config: IConfig["redis"], logger: Logger) => {
  const { enable, client } = config;
  if (!enable) return;
  if (instance) return instance;
  instance = new Redis(client);
  // 连接状态监听
  instance.on("connect", () => {
    logger.info("Redis connect");
  });
  instance.on("ready", () => {
    logger.info("Redis ready");
  });
  instance.on("error", (err) => {
    logger.error("Redis error:", err);
  });
  instance.on("close", () => {
    logger.info("Redis close");
  });
  instance.on("reconnecting", () => {
    logger.info("reconnecting Redis...");
  });
  return instance;
};
