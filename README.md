# AnyMe.js

AnyMe.js 是一个基于 Express.js 和 TypeScript 构建的现代化 Node.js Web 框架，集成了数据库、Redis、依赖注入等多种功能，旨在帮助开发者快速构建可扩展的 Web 应用。

## 特性

- 🚀 基于 Express.js 构建，兼容 Express 生态
- 🎯 使用 TypeScript 编写，提供完整的类型安全
- 💉 内置 InversifyJS 依赖注入容器
- 🗃️ 支持 TypeORM 数据库操作
- 🔥 集成 Redis 支持
- 🛡️ 内置 Helmet、Morgan 等安全和日志中间件
- 🧠 支持 Session 管理（内存/Redis）
- 🔄 使用 Rollup 构建，支持 ESM 和 CommonJS 格式
- 🌍 支持环境变量配置
- 📦 开箱即用的项目结构

## 快速开始

### 安装

```bash
# 使用 npm
npm install @anyme/anymejs

# 使用 pnpm
pnpm add @anyme/anymejs

# 使用 yarn
yarn add @anyme/anymejs
```

### 基本使用

```ts
//index.ts
import express from "express";
import { createApp } from "@anyme/anymejs";

createApp(express()).then((app) => {
  app.bootstrap();
});
```

### 配置

#### 项目支持通过环境变量或 .env 文件进行配置。默认配置如下：

```
# 服务器配置
PORT=3000
API_PREFIX=""

# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=""
DB_NAME=""

# Redis 配置
REDIS_SENTINEL_HOST=localhost
REDIS_SENTINEL_PORT=26379
REDIS_PASSWORD=""
REDIS_DB=0

# Session 配置
SESSION_SECRET="session"
```

#### 你也可以通过代码进行配置：

```ts
//config/default.config.ts
import { defineConfig } from "@anyme/anymejs";
const config = defineConfig({
  public_path: "public",
  port: 3000,
  api_prefix: "",
  logger: {
    level: "info",
    dir: "logs",
  },
  db: {
    //数据库配置
    enable: false,
    client: {
      type: "mysql",
      host: "localhost",
      port: "3306",
      username: "root",
      password: "",
      database: "",
      entities: [resolve("src/models/**/*{.ts,.js}")],
      migrations: [resolve("src/migrations/**/*{.ts,.js}")],
      poolSize: "10",
      synchronize: false, // 生产环境设为false，使用迁移
      logging: process.env.NODE_ENV === "development",
    },
  },
  redis: {
    //Redis配置
    enable: false,
    client: {
      name: "mymaster",
      password: "",
      db: "0",
      lazyConnect: true,
      sentinels: [
        {
          host: "localhost",
          port: "26379",
        },
      ],
    },
  },
  session: {
    //Session配置
    enable: true,
    prefix: "session:",
    type: "memory",
    client: {
      secret: "session",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 1000 * 60 * 60,
      },
    },
  },
  router: {
    //路由配置
    cors: {
      origin: "*",
      methods: "GET,POST,PUT,DELETE,OPTIONS",
      credentials: false,
    },
    routePrefix: "",
    controllers: [resolve("src/controllers/**/*{.ts,.js}")],
    middlewares: [resolve("src/middlewares/**/*{.ts,.js}")],
    interceptors: [resolve("src/interceptors/**/*{.ts,.js}")],
  },
  https: {
    //HTTPS配置
    enable: false,
    options: {
      port: 443,
      key: path.resolve(process.env.HTTPS_KEY || "key.pem"),
      cert: path.resolve(process.env.HTTPS_CERT || "cert.pem"),
    },
  },
});
```

#### 或者在 config/default.config.json

```json
{
  "port": 3000
}
```

#### 配置优先级：环境变量 > 项目配置 > 默认配置

#### 配置文件优先级：local/prod > default

### 项目结构

```
src/
├── config/          # 配置文件
├── controllers/     # 控制器
├── core/            # 核心模块
├── middlewares/     # 中间件
├── models/          # 数据模型
├── services/        # 服务层
├── types/           # 类型定义
├── utils/           # 工具函数
└── index.ts         # 入口文件
```

### 核心依赖

- Express.js v5
- InversifyJS v7
- TypeORM v0.3
- Redis (ioredis)
- Helmet 安全中间件
- Morgan 日志中间件
- Routing-controllers 路由控制

## 许可证

MIT
