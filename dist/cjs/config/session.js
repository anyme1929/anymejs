'use strict';

var session = require('express-session');
var sessionIoredis = require('../utils/session-ioredis.js');

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
        return new sessionIoredis({
            client: redis,
            prefix,
        });
    }
    getHandler() {
        this.handler ?? (this.handler = session(this.config));
        return this.handler;
    }
}

module.exports = CreateSession;
//# sourceMappingURL=session.js.map
