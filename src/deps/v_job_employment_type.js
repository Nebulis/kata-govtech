const knex = require('./db');

module.exports = (trx) => {
  return trx
    .select([
      knex.raw(`JSON_MERGE(CONCAT('[',GROUP_CONCAT(CONCAT('"', employment_types.employment_type, '"')), ']'),
        '[]') employment_types`),
    ])
    .from('job_employment_type')
    .leftJoin('employment_types', 'job_employment_type.employment_type_id', 'employment_types.id')
    .groupBy('job_post_id');
};
