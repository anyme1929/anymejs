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

```
# 使用 npm
npm install @anyme/anymejs

# 使用 pnpm
pnpm add @anyme/anymejs

# 使用 yarn
yarn add @anyme/anymejs
```
### 基本使用
```
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
```
//config/default.config.ts
import { createApp, defineConfig } from "@anyme/anymejs";
const config = defineConfig({
  port: 3000,
  db: {
    enable: true,
    client: {
      type: "mysql",
      host: "localhost",
      port: 3306,
      username: "root",
      password: "password",
      database: "mydb"
    }
  }
});
```
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
