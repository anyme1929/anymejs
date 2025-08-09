'use strict';

var node_fs = require('node:fs');

const node_env = process.env.NODE_ENV || "development";
const isDev = node_env === "development";
const envPath = isDev ? ".env.development" : ".env.production";
if (node_fs.existsSync(envPath))
    process.loadEnvFile(envPath);
//# sourceMappingURL=env.js.map
