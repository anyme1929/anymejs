import { existsSync } from "node:fs";
const node_env = process.env.NODE_ENV || "development";
const isDev = node_env === "development";
const envPath = isDev ? ".env.development" : ".env.production";
if (existsSync(envPath)) process.loadEnvFile(envPath);
// dotenv.config({
//   path: isDev ? ".env.development" : ".env.production",
// });
// 验证必要的环境变量
// const requiredEnvVars = ["DB_HOST", "DB_NAME", "DB_USER", "DB_PASSWORD"];
// requiredEnvVars.forEach((env) => {
//   if (!process.env[env])
//     throw new Error(`Missing required environment variable: ${env}`);
// });
