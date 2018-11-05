const knex = require('./db');

module.exports = (trx) => {
  return trx
    .select([
      knex.raw(`JSON_MERGE(CONCAT('[',GROUP_CONCAT(CONCAT('"', driving_licenses.driving_license, '"')), ']'),
        '[]') driving_licenses`),
    ])
    .from('job_driving_license')
    .leftJoin('driving_licenses', 'job_driving_license.driving_license_id', 'driving_licenses.id')
    .groupBy('job_post_id');
};
