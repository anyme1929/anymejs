import { existsSync } from 'node:fs';
import 'reflect-metadata';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import fg from 'fast-glob';
import express, { urlencoded } from 'express';
import { injectable, inject, Container } from 'inversify';
import helmet from 'helmet';
import morgan from 'morgan';
import { createTerminus } from '@godaddy/terminus';
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { useContainer, useExpressServer } from 'routing-controllers';
import { DataSource } from 'typeorm';
import { Redis } from 'ioredis';
import session, { Store } from 'express-session';

const node_env = process.env.NODE_ENV || "development";
const isDev = node_env === "development";
const envPath = isDev ? ".env.development" : ".env.production";
if (existsSync(envPath))
    process.loadEnvFile(envPath);

/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
/* global Reflect, Promise, SuppressedError, Symbol, Iterator */


function __decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}

function __param(paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
}

function __metadata(metadataKey, metadataValue) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(metadataKey, metadataValue);
}

function __classPrivateFieldGet(receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
}

function __classPrivateFieldSet(receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
}

typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
    var e = new Error(message);
    return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
};

function isObject(obj) {
    return (typeof obj === "object" &&
        obj !== null &&
        !Array.isArray(obj) &&
        Object.prototype.toString.call(obj) === "[object Object]");
}
function deepMerge(target, ...sources) {
    if (!sources.length)
        return target;
    const result = { ...target };
    for (const source of sources) {
        for (const key in source) {
            if (isObject(source[key]) && key in target)
                result[key] = deepMerge(target[key], source[key]);
            else
                result[key] = source[key];
        }
    }
    return result;
}
function isEmpty(value) {
    if (!value)
        return true;
    if (typeof value === "string" ||
        Array.isArray(value) ||
        (typeof value === "object" &&
            "length" in value &&
            typeof value.length === "number")) {
        return value.length === 0;
    }
    if (value instanceof Map || value instanceof Set) {
        return value.size === 0;
    }
    if (Object.prototype.toString.call(value) === "[object Object]") {
        return Object.keys(value).length === 0;
    }
    return false;
}
function defineConfig(config) {
    return config;
}

var _CoreConfig_path, _CoreConfig_config;
class CoreConfig {
    constructor() {
        _CoreConfig_path.set(this, process.env.CONFIG_PATH || "./app.config.{ts,js,json}");
        _CoreConfig_config.set(this, {
            public_path: "public",
            port: parseInt(process.env.PORT || "3000"),
            node_env: process.env.NODE_ENV || "development",
            is_dev: process.env.NODE_ENV === "development",
            api_prefix: process.env.API_PREFIX || "",
            db: {
                enable: false,
                client: {
                    type: "mysql",
                    host: process.env.DB_HOST || "localhost",
                    port: parseInt(process.env.DB_PORT || "3306"),
                    username: process.env.DB_USER || "root",
                    password: process.env.DB_PASSWORD || "",
                    database: process.env.DB_NAME || "",
                    entities: [resolve("src/models/**/*{.ts,.js}")],
                    migrations: [resolve("src/migrations/**/*{.ts,.js}")],
                    poolSize: parseInt(process.env.DB_POOL_SIZE || "10"),
                    synchronize: false,
                    logging: process.env.NODE_ENV === "development",
                },
            },
            redis: {
                enable: false,
                client: {
                    name: process.env.REDIS_MASTER_NAME || "mymaster",
                    password: process.env.REDIS_PASSWORD || "",
                    db: parseInt(process.env.REDIS_DB || "0"),
                    lazyConnect: true,
                    sentinels: [
                        {
                            host: process.env.REDIS_SENTINEL_HOST || "localhost",
                            port: parseInt(process.env.REDIS_SENTINEL_PORT || "26379"),
                        },
                    ],
                },
            },
            session: {
                enable: true,
                prefix: process.env.SESSION_PREFIX || "session:",
                type: "memory",
                client: {
                    secret: process.env.SESSION_SECRET || "session",
                    resave: false,
                    saveUninitialized: false,
                    cookie: {
                        secure: process.env.NODE_ENV === "production",
                        httpOnly: true,
                        maxAge: 1000 * 60 * 60,
                    },
                },
            },
            router: {
                cors: {
                    origin: process.env.CORS_ORIGIN || "*",
                    methods: process.env.CORS_METHODS || "GET,POST,PUT,DELETE,OPTIONS",
                    credentials: false,
                },
                routePrefix: process.env.API_PREFIX || "",
                controllers: [resolve("src/controllers/**/*{.ts,.js}")],
                middlewares: [resolve("src/middlewares/**/*{.ts,.js}")],
                interceptors: [resolve("src/interceptors/**/*{.ts,.js}")],
            },
            https: {
                enable: false,
                options: {
                    port: parseInt(process.env.HTTPS_PORT || "443"),
                    key: resolve(process.env.HTTPS_KEY || "key.pem"),
                    cert: resolve(process.env.HTTPS_CERT || "cert.pem"),
                },
            },
        });
    }
    async loadConfig(path) {
        const files = await fg(path || __classPrivateFieldGet(this, _CoreConfig_path, "f"), {
            onlyFiles: true,
            ignore: ["**/node_modules/**", "**/dist/**"],
            absolute: true,
        });
        if (!isEmpty(files))
            await this.setConfig(files[0]);
        return __classPrivateFieldGet(this, _CoreConfig_config, "f");
    }
    async setConfig(path) {
        try {
            const config = await this.resolve(path);
            __classPrivateFieldSet(this, _CoreConfig_config, deepMerge(__classPrivateFieldGet(this, _CoreConfig_config, "f"), config), "f");
        }
        catch (error) {
            console.error(`Error loading config file ${path}:`, error);
            throw error;
        }
    }
    async resolve(path) {
        if (typeof require === "undefined") {
            const fileUrl = pathToFileURL(path).toString();
            let mod = await import(fileUrl);
            mod = mod?.default?.__esModule ? mod.default : mod;
            return mod?.default || mod;
        }
        else {
            const mod = require(path);
            return mod?.__esModule && mod.default ? mod.default : mod;
        }
    }
    get config() {
        return __classPrivateFieldGet(this, _CoreConfig_config, "f");
    }
}
_CoreConfig_path = new WeakMap(), _CoreConfig_config = new WeakMap();

const SYMBOLS = {
    App: Symbol.for("App"),
    Config: Symbol.for("Config"),
    DataSource: Symbol.for("DataSource"),
    Redis: Symbol.for("Redis"),
    Logger: Symbol.for("Logger"),
    GracefulExit: Symbol.for("GracefulExit"),
    CreateSession: Symbol.for("CreateSession"),
    CreateServer: Symbol.for("CreateServer"),
    ClientIp: Symbol.for("ClientIp"),
    IocAdapter: Symbol.for("IocAdapter"),
    GlobalMiddlewares: Symbol.for("GlobalMiddlewares"),
};

let App = class App {
    constructor(config, logger, createSession, serverFactory, gracefulExit, globalMiddlewares, dataSource, redis) {
        this.config = config;
        this.logger = logger;
        this.createSession = createSession;
        this.serverFactory = serverFactory;
        this.gracefulExit = gracefulExit;
        this.globalMiddlewares = globalMiddlewares;
        this.dataSource = dataSource;
        this.redis = redis;
        this.app = express();
        this.server = null;
        this.globalMiddlewares.init(this.app);
    }
    async bootstrap(port) {
        if (this.server)
            return this.server;
        const { config, logger, dataSource, redis } = this;
        try {
            await this.initialize();
            const server = await this.serverFactory(this.app);
            this.server = await server.bootstrap(port || config.port);
            this.gracefulExit.register(this.server).setHealthCheck({
                "/health": async () => ({
                    timestamp: new Date().toISOString(),
                    db: dataSource?.isInitialized ? "connected" : "disconnected",
                    redis: redis?.status,
                }),
            });
            logger.info(`🚀 Server running on http://localhost:${port || config.port}`);
            return this.server;
        }
        catch (error) {
            logger.error("❌ Failed to start server:", error);
            throw error;
        }
    }
    use(...handlers) {
        this.globalMiddlewares.register(...handlers);
    }
    async initialize() {
        try {
            await Promise.all([
                this.initDatabase(),
                this.initRedis(),
                this.cinfigGlobalMiddlewares(),
            ]);
            await this.configSession();
        }
        catch (error) {
            this.logger.error("❌ Failed to initialize", error);
            throw error;
        }
    }
    async initDatabase() {
        const { config, dataSource, logger, gracefulExit } = this;
        try {
            if (!dataSource || config.db.enable === false || dataSource.isInitialized)
                return;
            await dataSource.initialize();
            logger.info("✅ Database connected");
            gracefulExit.addCleanupTask(async () => {
                await dataSource.destroy();
                logger.info("✅ Database connection closed");
            });
        }
        catch (error) {
            logger.error("❌ Failed to connect to database", error);
            throw error;
        }
    }
    async initRedis() {
        const { config, redis, logger, gracefulExit } = this;
        try {
            if (!redis || config.redis.enable === false)
                return;
            if (redis.status !== "wait")
                return;
            await redis.connect();
            logger.info("✅ Redis connected");
            gracefulExit.addCleanupTask(async () => {
                await redis.quit();
                logger.info("✅ Redis connection closed");
            });
        }
        catch (error) {
            logger.error("❌ Failed to connect to Redis", error);
            throw error;
        }
    }
    async configSession() {
        const { createSession, config, logger, globalMiddlewares } = this;
        try {
            const { enable, type, prefix } = config.session;
            if (enable === false)
                return;
            if (type === "redis") {
                if (!this.redis)
                    throw new Error("Redis is required");
                createSession.setRedis(prefix, this.redis);
            }
            const session = createSession.getHandler();
            globalMiddlewares.register(session);
            logger.info(`✅ Session set with ${type} store`);
        }
        catch (error) {
            logger.error("❌ Failed to config session:", error);
            throw error;
        }
    }
    async cinfigGlobalMiddlewares() {
        this.globalMiddlewares.register(urlencoded({ extended: true }), helmet(), morgan("dev"));
    }
};
App = __decorate([
    injectable("Singleton"),
    __param(0, inject(SYMBOLS.Config)),
    __param(1, inject(SYMBOLS.Logger)),
    __param(2, inject(SYMBOLS.CreateSession)),
    __param(3, inject(SYMBOLS.CreateServer)),
    __param(4, inject(SYMBOLS.GracefulExit)),
    __param(5, inject(SYMBOLS.GlobalMiddlewares)),
    __param(6, inject(SYMBOLS.DataSource)),
    __param(7, inject(SYMBOLS.Redis)),
    __metadata("design:paramtypes", [Object, Function, Object, Function, Object, Object, Function, Function])
], App);

class GracefulExit {
    constructor(logger) {
        this.logger = logger;
        this.isRegistered = false;
        this.isShuttingDown = false;
        this.cleanupTasks = new Set();
        this.healthCheck = {};
        this.uncaughtException = async (err) => {
            if (this.isShuttingDown)
                return;
            this.isShuttingDown = true;
            this.logger.error("⚠️ Uncaught Exception:", err);
            await this.cleanup();
        };
        this.unhandledRejection = async (err) => {
            if (this.isShuttingDown)
                return;
            this.isShuttingDown = true;
            this.logger.error("⚠️ Unhandled Rejection:", err);
            await this.cleanup();
        };
    }
    register(server, options) {
        if (this.isRegistered)
            return this;
        if (!server.listening)
            throw new Error("Server Not Listening");
        this.isRegistered = true;
        this.removeAllListener();
        this.addCleanupTask(async () => {
            this.logger.info("✅ container disposed");
        });
        this.setupProcessHandlers();
        createTerminus(server, {
            logger: (msg, err) => {
                if (err)
                    this.logger.error(msg, err);
                if (msg)
                    this.logger.info(msg);
            },
            timeout: options?.timeout || 30000,
            signals: options?.signals || ["SIGINT", "SIGTERM"],
            healthChecks: this.healthCheck,
            onSignal: async () => {
                if (this.isShuttingDown)
                    return;
                this.isShuttingDown = true;
                this.logger.info("🚦 Received termination signal");
                await this.cleanup();
            },
        });
        return this;
    }
    addCleanupTask(...task) {
        task.forEach((i) => this.cleanupTasks.add(i));
    }
    setHealthCheck(healthCheck) {
        this.healthCheck = healthCheck;
    }
    async cleanup() {
        if (this.cleanupTasks.size === 0)
            return;
        await Promise.all([...this.cleanupTasks].map((task) => task()));
        this.cleanupTasks.clear();
        this.logger.info("✅ All resources closed").end();
    }
    setupProcessHandlers() {
        process.on("uncaughtException", this.uncaughtException);
        process.on("unhandledRejection", this.unhandledRejection);
    }
    removeAllListener() {
        const signals = [
            "SIGINT",
            "SIGTERM",
            "uncaughtException",
            "unhandledRejection",
        ];
        signals.forEach((signal) => {
            process.listeners(signal).forEach((i) => {
                if (i.name === signal || "cleanup")
                    process.removeListener(signal, i);
            });
        });
    }
}

class InversifyAdapter {
    constructor(container) {
        this.container = container;
    }
    get(someClass, action) {
        const child = new Container({ parent: this.container });
        child.bind(SYMBOLS.ClientIp).toConstantValue(action?.context.ip);
        return child.get(someClass);
    }
}

class GlobalMiddlewares {
    constructor() {
        this.anonymous = "<anonymous>";
        this.app = null;
        this.middlewareList = new Map();
    }
    init(app) {
        if (this.app)
            return this;
        this.app = app;
        return this;
    }
    register(...handlers) {
        this.validate(handlers);
        this.addBatch(this.formatHandlers(...handlers));
    }
    validate(handlers) {
        if (isEmpty(handlers))
            throw new Error("Middleware handlers cannot be empty");
        if (!this.app) {
            throw new Error("GlobalMiddlewares must be initialized with an Express app instance");
        }
    }
    formatHandlers(...handlers) {
        return handlers.map((h) => {
            return this.isIHandler(h)
                ? h
                : { name: h.name || this.anonymous, handle: h };
        });
    }
    isIHandler(item) {
        if (!item || typeof item !== "object")
            return false;
        return "name" in item && "handle" in item;
    }
    exists(handler) {
        if (handler.name === this.anonymous)
            return false;
        return this.middlewareList.has(handler.name) ||
            this.middlewareList.has(handler.handle.name)
            ? handler.name
            : false;
    }
    addBatch(items) {
        const name = new Set();
        const handles = items.filter((i) => {
            const exists = this.exists(i);
            if (exists)
                name.add(exists);
            else {
                if (i.name === this.anonymous)
                    this.setAnonymous(i.handle);
                else
                    this.middlewareList.set(i.name, i.handle);
            }
            return !exists;
        });
        if (name.size > 0)
            throw new Error(`[${[...name].join(", ")}] middleware already registered`);
        if (handles.length > 0)
            this.app.use(handles.map((i) => i.handle));
    }
    setAnonymous(handle) {
        const anonymous = this.middlewareList.get(this.anonymous);
        if (Array.isArray(anonymous))
            anonymous.push(handle);
        else
            this.middlewareList.set(this.anonymous, [handle]);
    }
    get routers() {
        return this.middlewareList;
    }
}

const is_dev = process.env.NODE_ENV === "development";
const level = is_dev ? "debug" : "info";
const logger = winston.createLogger({
    level,
    format: winston.format.combine(winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }), winston.format.errors({ stack: true }), winston.format.json(), winston.format.printf(({ timestamp, level, message, stack }) => {
        const l = level.toUpperCase();
        return stack
            ? `${timestamp} [${l}] ${message}\n${stack}`
            : `${timestamp} [${l}] ${message}`;
    })),
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(winston.format.colorize({ all: true })),
        }),
        new DailyRotateFile({
            filename: "logs/app-%DATE%.log",
            datePattern: "YYYY-MM-DD",
            zippedArchive: true,
            maxSize: "20m",
            maxFiles: is_dev ? "7d" : "30d",
        }),
    ],
});

class CreateServer {
    constructor(config, iocAdapter, app) {
        this.app = app;
        this.server = null;
        this.pending = null;
        useContainer(iocAdapter);
        this.app = useExpressServer(app, config);
    }
    async bootstrap(port) {
        if (this.pending)
            return this.pending;
        this.pending = new Promise((resolve, reject) => {
            if (this.server?.listening)
                throw new Error("Server already running");
            this.server = this.app.listen(port, (error) => {
                if (error)
                    reject(error);
                else
                    resolve(this.server);
                this.pending = null;
            });
        });
        return this.pending;
    }
    async close() {
        if (this.pending)
            await this.pending;
        if (!this.server?.listening)
            return;
        return new Promise((resolve, reject) => {
            this.server.close((error) => {
                if (error)
                    reject(error);
                else {
                    this.server = null;
                    resolve();
                }
            });
        });
    }
}

let dataSource = null;
var CreateDataSource = (config) => {
    const { enable, client } = config;
    if (!enable)
        return;
    if (dataSource)
        return dataSource;
    dataSource = new DataSource(client);
    return dataSource;
};

let instance = null;
var CreateRedis = (config) => {
    const { enable, client } = config;
    if (!enable)
        return;
    if (instance)
        return instance;
    instance = new Redis(client);
    return instance;
};

function optionalCb(err, data, cb) {
    if (cb)
        return cb(err, data);
    if (err)
        throw err;
    return data;
}
class RedisStore extends Store {
    constructor(opts) {
        super();
        this.prefix = opts.prefix == null ? "sess:" : opts.prefix;
        this.scanCount = opts.scanCount || 100;
        this.serializer = opts.serializer || JSON;
        this.ttl = opts.ttl || 86400;
        this.disableTTL = opts.disableTTL || false;
        this.disableTouch = opts.disableTouch || false;
        this.client = opts.client;
    }
    async get(sid, cb) {
        const key = this.prefix + sid;
        try {
            const data = await this.client.get(key);
            if (!data)
                return optionalCb(null, null, cb);
            return optionalCb(null, await this.serializer.parse(data), cb);
        }
        catch (err) {
            return optionalCb(err, null, cb);
        }
    }
    async set(sid, sess, cb) {
        const key = this.prefix + sid;
        const ttl = this.getTTL(sess);
        try {
            if (ttl > 0) {
                const val = this.serializer.stringify(sess);
                if (this.disableTTL) {
                    await this.client.set(key, val);
                }
                else {
                    await this.client.setex(key, ttl, val);
                }
                return optionalCb(null, null, cb);
            }
            return this.destroy(sid, cb);
        }
        catch (err) {
            return optionalCb(err, null, cb);
        }
    }
    async touch(sid, sess, cb) {
        const key = this.prefix + sid;
        if (this.disableTouch || this.disableTTL)
            return optionalCb(null, null, cb);
        try {
            await this.client.expire(key, this.getTTL(sess));
            return optionalCb(null, null, cb);
        }
        catch (err) {
            return optionalCb(err, null, cb);
        }
    }
    async destroy(sid, cb) {
        const key = this.prefix + sid;
        try {
            await this.client.del(key);
            return optionalCb(null, null, cb);
        }
        catch (err) {
            return optionalCb(err, null, cb);
        }
    }
    async clear(cb) {
        try {
            const keys = await this.getAllKeys();
            if (!keys.length)
                return optionalCb(null, null, cb);
            await this.client.del(keys);
            return optionalCb(null, null, cb);
        }
        catch (err) {
            return optionalCb(err, null, cb);
        }
    }
    async length(cb) {
        try {
            const keys = await this.getAllKeys();
            return optionalCb(null, keys.length, cb);
        }
        catch (err) {
            return optionalCb(err, null, cb);
        }
    }
    async ids(cb) {
        const len = this.prefix.length;
        try {
            const keys = await this.getAllKeys();
            return optionalCb(null, keys.map((k) => k.substring(len)), cb);
        }
        catch (err) {
            return optionalCb(err, null, cb);
        }
    }
    async all(cb) {
        const len = this.prefix.length;
        try {
            const keys = await this.getAllKeys();
            if (keys.length === 0)
                return optionalCb(null, [], cb);
            const data = await this.client.mget(keys);
            const results = data.reduce((acc, raw, idx) => {
                if (!raw)
                    return acc;
                const sess = this.serializer.parse(raw);
                sess.id = keys[idx].substring(len);
                acc.push(sess);
                return acc;
            }, []);
            return optionalCb(null, results, cb);
        }
        catch (err) {
            return optionalCb(err, null, cb);
        }
    }
    getTTL(sess) {
        if (typeof this.ttl === "function")
            return this.ttl(sess);
        let ttl;
        if (sess?.cookie?.expires) {
            const ms = Number(new Date(sess.cookie.expires)) - Date.now();
            ttl = Math.ceil(ms / 1000);
        }
        else {
            ttl = this.ttl;
        }
        return ttl;
    }
    async getAllKeys() {
        const pattern = this.prefix + "*";
        const set = new Set();
        let cursor = "0";
        do {
            const [newCursor, keys] = await this.client.scan(cursor, "MATCH", pattern, "COUNT", this.scanCount);
            cursor = newCursor;
            keys.forEach((key) => set.add(key));
        } while (cursor !== "0");
        return set.size > 0 ? Array.from(set) : [];
    }
}

class CreateSession {
    constructor(config) {
        this.handler = null;
        this.config = {
            secret: "session",
            resave: false,
            saveUninitialized: false,
        };
        this.config = Object.assign({}, this.config, config);
    }
    setRedis(prefix, redis) {
        if (!redis)
            throw new Error("Redis instance is required");
        this.config.store = this.createRedisStore(prefix, redis);
    }
    createRedisStore(prefix, redis) {
        return new RedisStore({
            client: redis,
            prefix,
        });
    }
    getHandler() {
        this.handler ?? (this.handler = session(this.config));
        return this.handler;
    }
}

class DI {
    static register() {
        this.container
            .bind(SYMBOLS.Config)
            .toDynamicValue(async () => {
            return await new CoreConfig().loadConfig();
        })
            .inSingletonScope();
        this.container.bind(SYMBOLS.Logger).toConstantValue(logger);
        this.container
            .bind(SYMBOLS.IocAdapter)
            .toConstantValue(new InversifyAdapter(this.container));
        this.container
            .bind(SYMBOLS.DataSource)
            .toResolvedValue((config) => {
            const { db } = config;
            return CreateDataSource(db);
        }, [SYMBOLS.Config])
            .inSingletonScope();
        this.container
            .bind(SYMBOLS.Redis)
            .toResolvedValue((config) => {
            const { redis } = config;
            return CreateRedis(redis);
        }, [SYMBOLS.Config])
            .inSingletonScope();
        this.container
            .bind(SYMBOLS.CreateSession)
            .toResolvedValue((config) => {
            const { session } = config;
            return new CreateSession(session.client);
        }, [SYMBOLS.Config])
            .inSingletonScope();
        this.container
            .bind(SYMBOLS.CreateServer)
            .toProvider((ctx) => {
            let instance = undefined;
            const iocAdapter = ctx.get(SYMBOLS.IocAdapter);
            return async (app) => {
                const { router } = await ctx.getAsync(SYMBOLS.Config);
                if (!instance)
                    instance = new CreateServer(router, iocAdapter, app);
                return instance;
            };
        });
        this.container
            .bind(SYMBOLS.GracefulExit)
            .toResolvedValue((logger) => new GracefulExit(logger), [SYMBOLS.Logger])
            .inSingletonScope();
        this.container
            .bind(SYMBOLS.GlobalMiddlewares)
            .to(GlobalMiddlewares)
            .inSingletonScope();
        this.container.bind(SYMBOLS.App).to(App);
    }
    static async getApp() {
        return await this.container.getAsync(SYMBOLS.App);
    }
}
DI.container = new Container();
DI.register();

const ready = () => DI.getApp();

export { defineConfig, ready };
//# sourceMappingURL=index.js.map
