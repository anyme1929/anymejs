'use strict';

var ioredis = require('ioredis');

let instance = null;
var CreateRedis = (config) => {
    const { enable, client } = config;
    if (!enable)
        return;
    if (instance)
        return instance;
    instance = new ioredis.Redis(client);
    return instance;
};

module.exports = CreateRedis;
//# sourceMappingURL=redis.js.map
