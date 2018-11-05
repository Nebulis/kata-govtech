const knex = require('./db');

module.exports = (trx) => {
  return trx
    .select([
      knex.raw(`JSON_MERGE(CONCAT('[',GROUP_CONCAT(CONCAT('"', categories.category, '"')), ']'), '[]') categories`),
    ])
    .from('job_category')
    .leftJoin('categories', 'job_category.category_id', 'categories.id')
    .groupBy('job_post_id');
};
