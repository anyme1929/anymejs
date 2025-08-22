//import * as express from "express";
import type { IRedis, ICache, Redis, Cluster } from "../types";
declare global {
  namespace Express {
    interface Request {
      redis: IRedis | Redis | Cluster;
      cache: ICache;
    }
  }
}
