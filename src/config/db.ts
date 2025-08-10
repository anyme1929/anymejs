import { DataSource } from "typeorm";
import { IConfig } from "../types";
let dataSource: DataSource | null = null;
export default (config: IConfig["db"]) => {
  const { enable, client } = config;
  if (!enable) return config;
  if (dataSource) return dataSource;
  dataSource = new DataSource(client);
  return dataSource;
};
