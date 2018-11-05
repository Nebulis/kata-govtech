const knex = require('./db');

module.exports = (trx) => {
  return trx
    .select([
      knex.raw(`JSON_MERGE(CONCAT('[',GROUP_CONCAT(CONCAT('"',
        (CASE vocational_license_id WHEN 57 THEN others ELSE vocational_license END),
        '"')), ']'),'[]') vocational_licenses`),
    ])
    .from('job_vocational_license')
    .leftJoin('vocational_licenses', 'job_vocational_license.vocational_license_id', 'vocational_licenses.id')
    .groupBy('job_post_id');
};
