import * as express from "express";
import { IRedis } from "../types";
declare global {
  namespace Express {
    interface Request {
      redis: IRedis;
    }
  }
}
