'use strict';

require('./env.js');
var inversify_config = require('./inversify.config.js');
var index = require('./utils/index.js');

const ready = () => inversify_config.DI.getApp();

exports.defineConfig = index.defineConfig;
exports.ready = ready;
//# sourceMappingURL=index.js.map
