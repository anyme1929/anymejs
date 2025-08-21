import "reflect-metadata";
import "./utils/env";
import DI from "./inversify.config";
export { defineConfig, ENC } from "./utils";
export { type IRedis, type ICache } from "./types";
export const createApp = DI.createApp;
export const injectRepository = DI.injectRepository;
export const injectDataSource = DI.injectDataSource;
export const injectRedis = DI.injectRedis;
export const injectCache = DI.injectCache;
export const injectLogger = DI.injectLogger;
export const injectConfig = DI.injectConfig;
export const Redis = DI.Redis;
import express from "express";
createApp(express()).then((app) => {
  app.use(express.urlencoded({ extended: true }));
  app.bootstrap();
});
