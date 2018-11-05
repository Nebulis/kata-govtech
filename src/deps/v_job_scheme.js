const knex = require('./db');

module.exports = (trx) => {
  return trx
    .select([knex.raw(`JSON_MERGE(CONCAT('[',GROUP_CONCAT(CONCAT('"', schemes.scheme, '"')), ']'), '[]') schemes`)])
    .from('job_scheme')
    .leftJoin('schemes', 'job_scheme.scheme_id', 'schemes.id')
    .groupBy('job_post_id');
};
