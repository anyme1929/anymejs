//import * as express from "express";
import type { DataSource } from "typeorm";
import type { Redis, Cluster } from "ioredis";
import type { IDataSource, IRedis, ICache, Redis, Cluster } from "../types";
// declare global {
//   namespace Express {
//     interface Request {
//       redis: IRedis | Redis | Cluster;
//       cache: ICache;
//       db: DataSource | IDataSource;
//     }
//   }
// }
