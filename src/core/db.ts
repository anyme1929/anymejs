import { DataSource } from "typeorm";
import { IConfig, Logger } from "../types";
let dataSource: DataSource | null = null;
export class ADataSource {
  private static dataSourceMap: Map<string, DataSource> = new Map();
  constructor(private logger: Logger, config: IConfig["db"]) {
    this.init(config);
  }
  init(config: IConfig["db"]) {}
}
export default (config: IConfig["db"]) => {
  const { enable, client } = config;
  if (!enable) return;
  if (dataSource) return dataSource;
  dataSource = new DataSource(client!);
  return dataSource;
};
