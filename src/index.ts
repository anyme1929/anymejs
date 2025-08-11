import "./env";
import { DI } from "./inversify.config";
import express from "express";
export { defineConfig } from "./utils";
// export const ready = DI.createApp();
// ready().then((app) => {
//   app.bootstrap();
// });
export const ready = DI.createExpress;
ready(express()).then((app) => {
  app.bootstrap();
});
