const config = require('@duelyst/config');

const knex = require('knex')({
  client: 'postgres',
  connection: config.get('postgres_connection_string'),
  debug: false, // config.isDevelopment()
  pool: {
    min: 2,
    max: 8,
  },
});

module.exports = knex;
