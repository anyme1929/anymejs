'use strict';

var inversify = require('inversify');
var constants = require('../types/constants.js');

class InversifyAdapter {
    constructor(container) {
        this.container = container;
    }
    get(someClass, action) {
        const child = new inversify.Container({ parent: this.container });
        child.bind(constants.SYMBOLS.ClientIp).toConstantValue(action?.context.ip);
        return child.get(someClass);
    }
}

module.exports = InversifyAdapter;
//# sourceMappingURL=inversify-adapter.js.map
