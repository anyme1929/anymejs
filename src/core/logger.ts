import winston, { type Logger } from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import type { IConfig } from "../types";
export class WinstonLogger {
  private _logger: Logger;
  constructor(config: IConfig["logger"]) {
    this._logger = winston.createLogger({
      level: config.level,
      format: config.format,
    });
    if (config.transports.console)
      this._logger.add(
        new winston.transports.Console(config.transports.console)
      );
    if (config.transports.file)
      this._logger.add(new DailyRotateFile(config.transports.file));
  }
  get logger() {
    return this._logger;
  }
}
