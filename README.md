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

# 日志配置
LOG_LEVEL="info"

# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=""
DB_DATABASE=""

# Redis 配置
REDIS_MASTER_NAME="mymaster"
REDIS_USERNAME=""
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=""
REDIS_DATABASE=0

# Session 配置
SESSION_SECRET="session"
SESSION_PREFIX=""

# HTTPS 配置
HTTPS_PORT=443
HTTPS_KEY="path/to/key.pem"
HTTPS_CERT="path/to/cert.pem"
```

#### 你也可以通过代码进行配置：

```ts
//config/default.config.ts
import { defineConfig } from "@anyme/anymejs";
const config = defineConfig({
  port: 3000,
  logger: {
    level: "info",
  },
  db: {
    enable: false,
    client: {
      type: "mysql",
      host: "localhost",
      port: 3306,
      username: "root",
      password: "",
      database: "",
      entities: [resolve("src/models/**/*{.ts,.js}")],
      migrations: [resolve("src/migrations/**/*{.ts,.js}")],
      poolSize: 5,
      synchronize: false,
      logging: process.env.NODE_ENV === "development",
    },
  },
  redis: {
    enable: false,
    client: {
      lazyConnect: true,
    },
  },
  session: {
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
    enable: false,
    options: {
      port: 443,
      key: "path/to/key.pem",
      cert: "path/to/cert.pem",
    },
  },
});
```

#### 或者使用 JSON 格式，创建 config/default.config.json：

```json
{
  "port": 3000
}
```

#### 配置优先级：环境变量 > 项目配置 > 默认配置

#### 配置文件按以下顺序加载：

1. 环境特定配置（如 prod.config.ts、local.config.ts、test.config.ts）
2. 默认配置（default.config.ts）

### HTTPS 本地开发

#### 使用 openssl 创建证书

在./ssl 目录下 创建 openssl.cnf

```bash
[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = dn
x509_extensions = v3_ca

[dn]
C = US
ST = State
L = City
O = Organization
OU = Department
CN = localhost

[v3_ca]
subjectAltName = @alt_names
keyUsage = digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
basicConstraints = CA:FALSE

[alt_names]
DNS.1 = localhost
DNS.2 = 127.0.0.1
IP.1 = 127.0.0.1
IP.2 = ::1

```

生成证书和私钥

```
#生成私钥

openssl genrsa -out server.key 2048

#使用配置文件生成自签名证书

openssl req -new -x509 -days 3650 -key server.key -out server.crt -config openssl.cnf
```

这将生成两个文件：

- server.key：私钥文件

- server.crt：证书文件（有效期 10 年）

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
- Socket.IO
- TypeScript v5
- express-sse sse 服务器推送
- Routing-controllers 基于装饰器的路由
- Routing-controllers-openapi 生成 OpenAPI 文档

## 许可证

MIT
