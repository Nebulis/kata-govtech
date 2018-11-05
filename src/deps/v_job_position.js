const knex = require('./db');

module.exports = (trx) => {
  return trx
    .select([
      knex.raw(
        `JSON_MERGE(CONCAT('[',GROUP_CONCAT(CONCAT('"', position_levels.position, '"')), ']'), '[]') position_levels`,
      ),
    ])
    .from('job_position')
    .leftJoin('position_levels', 'job_position.position_id', 'position_levels.id')
    .groupBy('job_post_id');
};
