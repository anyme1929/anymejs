'use strict';

var tslib_es6 = require('./node_modules/.pnpm/@rollup_plugin-typescript@1_4cb859db7663cf55b6eaf4302f855b65/node_modules/tslib/tslib.es6.js');
var node_path = require('node:path');
var node_url = require('node:url');
var fg = require('fast-glob');
var index = require('./utils/index.js');

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
                    entities: [node_path.resolve("src/models/**/*{.ts,.js}")],
                    migrations: [node_path.resolve("src/migrations/**/*{.ts,.js}")],
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
                controllers: [node_path.resolve("src/controllers/**/*{.ts,.js}")],
                middlewares: [node_path.resolve("src/middlewares/**/*{.ts,.js}")],
                interceptors: [node_path.resolve("src/interceptors/**/*{.ts,.js}")],
            },
            https: {
                enable: false,
                options: {
                    port: parseInt(process.env.HTTPS_PORT || "443"),
                    key: node_path.resolve(process.env.HTTPS_KEY || "key.pem"),
                    cert: node_path.resolve(process.env.HTTPS_CERT || "cert.pem"),
                },
            },
        });
    }
    async loadConfig(path) {
        const files = await fg(path || tslib_es6.__classPrivateFieldGet(this, _CoreConfig_path, "f"), {
            onlyFiles: true,
            ignore: ["**/node_modules/**", "**/dist/**"],
            absolute: true,
        });
        if (!index.isEmpty(files))
            await this.setConfig(files[0]);
        return tslib_es6.__classPrivateFieldGet(this, _CoreConfig_config, "f");
    }
    async setConfig(path) {
        try {
            const config = await this.resolve(path);
            tslib_es6.__classPrivateFieldSet(this, _CoreConfig_config, index.deepMerge(tslib_es6.__classPrivateFieldGet(this, _CoreConfig_config, "f"), config), "f");
        }
        catch (error) {
            console.error(`Error loading config file ${path}:`, error);
            throw error;
        }
    }
    async resolve(path) {
        if (typeof require === "undefined") {
            const fileUrl = node_url.pathToFileURL(path).toString();
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
        return tslib_es6.__classPrivateFieldGet(this, _CoreConfig_config, "f");
    }
}
_CoreConfig_path = new WeakMap(), _CoreConfig_config = new WeakMap();

exports.CoreConfig = CoreConfig;
//# sourceMappingURL=core.config.js.map
