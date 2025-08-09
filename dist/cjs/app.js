'use strict';

var tslib_es6 = require('./node_modules/.pnpm/@rollup_plugin-typescript@1_4cb859db7663cf55b6eaf4302f855b65/node_modules/tslib/tslib.es6.js');
var express = require('express');
var inversify = require('inversify');
var helmet = require('helmet');
var morgan = require('morgan');
var constants = require('./types/constants.js');

exports.App = class App {
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
        this.globalMiddlewares.register(express.urlencoded({ extended: true }), helmet(), morgan("dev"));
    }
};
exports.App = tslib_es6.__decorate([
    inversify.injectable("Singleton"),
    tslib_es6.__param(0, inversify.inject(constants.SYMBOLS.Config)),
    tslib_es6.__param(1, inversify.inject(constants.SYMBOLS.Logger)),
    tslib_es6.__param(2, inversify.inject(constants.SYMBOLS.CreateSession)),
    tslib_es6.__param(3, inversify.inject(constants.SYMBOLS.CreateServer)),
    tslib_es6.__param(4, inversify.inject(constants.SYMBOLS.GracefulExit)),
    tslib_es6.__param(5, inversify.inject(constants.SYMBOLS.GlobalMiddlewares)),
    tslib_es6.__param(6, inversify.inject(constants.SYMBOLS.DataSource)),
    tslib_es6.__param(7, inversify.inject(constants.SYMBOLS.Redis)),
    tslib_es6.__metadata("design:paramtypes", [Object, Function, Object, Function, Object, Object, Function, Function])
], exports.App);
//# sourceMappingURL=app.js.map
