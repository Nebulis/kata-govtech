const knex = require('knex')({
    client: 'mysql',
    connection:
      {
        host: '127.0.0.1',
        port: 3306,
        user: '',
        password: '',
        database: '',
        connectTimeout: 10000,
        timezone: 'UTC'
      },
    acquireConnectionTimeout: 10000
  }
);

module.exports = knex;
