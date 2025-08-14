import "reflect-metadata";
import "./utils/env";
import { DI } from "./inversify.config";
export { defineConfig, ENC } from "./utils";
export const createApp = DI.createApp;
export const container = DI.container;
import express from "express";
createApp(express()).then((app) => {
  app.bootstrap();
});
