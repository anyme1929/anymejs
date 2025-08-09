'use strict';

var routingControllers = require('routing-controllers');

class CreateServer {
    constructor(config, iocAdapter, app) {
        this.app = app;
        this.server = null;
        this.pending = null;
        routingControllers.useContainer(iocAdapter);
        this.app = routingControllers.useExpressServer(app, config);
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

module.exports = CreateServer;
//# sourceMappingURL=server.js.map
