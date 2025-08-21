//import * as express from "express";
import type { IRedis, ICache } from "../types";
declare global {
  namespace Express {
    interface Request {
      redis: IRedis;
      cache: ICache;
    }
  }
}
