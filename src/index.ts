import "reflect-metadata";
import "./utils/env";
import { DI } from "./inversify.config";
export { defineConfig, ENC } from "./utils";
export const createApp = DI.createApp;
export const injectRepository = DI.injectRepository;
export const injectDataSource = DI.injectDataSource;
export const injectRedis = DI.injectRedis;
export const injectLogger = DI.injectLogger;
export const Config = DI.injectConfig;
import express from "express";
createApp(express()).then((app) => {
  app.bootstrap();
});
