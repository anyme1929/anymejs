"use strict";var e=require("node:fs");const n="development"===(process.env.NODE_ENV||"development")?".env.development":".env.production";e.existsSync(n)&&process.loadEnvFile(n);
//# sourceMappingURL=env.js.map
