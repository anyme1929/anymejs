import "./env";
import { DI } from "./inversify.config";
export { defineConfig } from "./utils";
export const ready = () => DI.getApp();
