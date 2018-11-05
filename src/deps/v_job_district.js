const knex = require('./db');

module.exports = (trx) => {
  return trx
    .select([knex.raw(`JSON_MERGE(CONCAT('[',GROUP_CONCAT(district_id), ']'), '[]') district_ids`)])
    .from('job_district')
    .leftJoin('districts', 'job_district.district_id', 'districts.id')
    .groupBy('job_post_id');
};
