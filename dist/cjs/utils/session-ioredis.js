'use strict';

var session = require('express-session');

function optionalCb(err, data, cb) {
    if (cb)
        return cb(err, data);
    if (err)
        throw err;
    return data;
}
class RedisStore extends session.Store {
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

module.exports = RedisStore;
//# sourceMappingURL=session-ioredis.js.map
