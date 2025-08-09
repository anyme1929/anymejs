'use strict';

var typeorm = require('typeorm');

let dataSource = null;
var CreateDataSource = (config) => {
    const { enable, client } = config;
    if (!enable)
        return;
    if (dataSource)
        return dataSource;
    dataSource = new typeorm.DataSource(client);
    return dataSource;
};

module.exports = CreateDataSource;
//# sourceMappingURL=db.js.map
