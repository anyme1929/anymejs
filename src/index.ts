import "reflect-metadata";
import "./utils/env";
import { DI } from "./inversify.config";
export * from "typeorm";
export * from "inversify";
export { defineConfig, ENC } from "./utils";
export const createApp = DI.createApp;
export const injectRepository = DI.injectRepository;
import express from "express";
createApp(express()).then((app) => {
  app.bootstrap();
});
