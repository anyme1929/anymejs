import { loadEnv } from "./utils";
const node_env = process.env.NODE_ENV || "development";
const isDev = node_env === "development";
const envPath = isDev ? ".env.local" : ".env.prod";
loadEnv([envPath, ".env"], { override: true });
