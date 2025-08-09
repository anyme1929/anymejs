'use strict';

var index = require('./index.js');

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
        if (index.isEmpty(handlers))
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

module.exports = GlobalMiddlewares;
//# sourceMappingURL=global-middlewares.js.map
