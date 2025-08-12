import "./env";
import { DI } from "./inversify.config";
import express from "express";
export { defineConfig, ENC } from "./utils";
export const ready = DI.createApp;
ready(express()).then((app) => {
  app.bootstrap();
});
