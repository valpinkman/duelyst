const fs = require('fs');
const path = require('path');
require('app-module-path').addPath(path.join(__dirname, '..'));
// Migrations import SDK modules, which are TypeScript. knex loads this file
// before any migration, so registering the hook here covers all of them --
// but only when running from source. The ahead-of-time tree under build/ is
// already JavaScript, and migrations run once per deploy rather than per boot,
// so the migrate image deliberately stays on the source path.
if (fs.existsSync(path.join(__dirname, 'api.ts'))) {
  require('tsx/cjs');
}
const config = require('../config/config');

const environmentName = process.env.NODE_ENV;
const knexConfig = {};

if (!process.env.NODE_ENV) {
  throw new Error('Can not run without NODE_ENV');
}

knexConfig[environmentName] = {
  client: 'postgresql',
  connection: config.get('postgres_connection_string'),
  pool: {
    min: 1,
    max: 10,
  },
  migrations: {
    tableName: 'knex_migrations',
  },
};

module.exports = knexConfig;
