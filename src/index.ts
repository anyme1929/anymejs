import "reflect-metadata";
import "./env";
import { DI } from "./inversify.config";
export { defineConfig, ENC } from "./utils";
export const createApp = DI.createApp;
// import express from "express";
// createApp(express()).then((app) => {
//   app.bootstrap();
// });
