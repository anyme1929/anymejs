'use strict';

require('reflect-metadata');
var core_config = require('./core.config.js');
var app = require('./app.js');
var gracefulExit = require('./utils/graceful-exit.js');
var inversifyAdapter = require('./utils/inversify-adapter.js');
var globalMiddlewares = require('./utils/global-middlewares.js');
var inversify = require('inversify');
var logger = require('./config/logger.js');
var server = require('./config/server.js');
var db = require('./config/db.js');
var redis = require('./config/redis.js');
var session = require('./config/session.js');
var constants = require('./types/constants.js');

class DI {
    static register() {
        this.container
            .bind(constants.SYMBOLS.Config)
            .toDynamicValue(async () => {
            return await new core_config.CoreConfig().loadConfig();
        })
            .inSingletonScope();
        this.container.bind(constants.SYMBOLS.Logger).toConstantValue(logger);
        this.container
            .bind(constants.SYMBOLS.IocAdapter)
            .toConstantValue(new inversifyAdapter(this.container));
        this.container
            .bind(constants.SYMBOLS.DataSource)
            .toResolvedValue((config) => {
            const { db: db$1 } = config;
            return db(db$1);
        }, [constants.SYMBOLS.Config])
            .inSingletonScope();
        this.container
            .bind(constants.SYMBOLS.Redis)
            .toResolvedValue((config) => {
            const { redis: redis$1 } = config;
            return redis(redis$1);
        }, [constants.SYMBOLS.Config])
            .inSingletonScope();
        this.container
            .bind(constants.SYMBOLS.CreateSession)
            .toResolvedValue((config) => {
            const { session: session$1 } = config;
            return new session(session$1.client);
        }, [constants.SYMBOLS.Config])
            .inSingletonScope();
        this.container
            .bind(constants.SYMBOLS.CreateServer)
            .toProvider((ctx) => {
            let instance = undefined;
            const iocAdapter = ctx.get(constants.SYMBOLS.IocAdapter);
            return async (app) => {
                const { router } = await ctx.getAsync(constants.SYMBOLS.Config);
                if (!instance)
                    instance = new server(router, iocAdapter, app);
                return instance;
            };
        });
        this.container
            .bind(constants.SYMBOLS.GracefulExit)
            .toResolvedValue((logger) => new gracefulExit(logger), [constants.SYMBOLS.Logger])
            .inSingletonScope();
        this.container
            .bind(constants.SYMBOLS.GlobalMiddlewares)
            .to(globalMiddlewares)
            .inSingletonScope();
        this.container.bind(constants.SYMBOLS.App).to(app.App);
    }
    static async getApp() {
        return await this.container.getAsync(constants.SYMBOLS.App);
    }
}
DI.container = new inversify.Container();
DI.register();

exports.DI = DI;
//# sourceMappingURL=inversify.config.js.map
