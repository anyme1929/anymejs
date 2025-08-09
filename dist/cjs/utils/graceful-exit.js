'use strict';

var terminus = require('@godaddy/terminus');

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
        terminus.createTerminus(server, {
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

module.exports = GracefulExit;
//# sourceMappingURL=graceful-exit.js.map
