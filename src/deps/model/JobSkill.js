const Model = require('objection').Model;

/*
  Placeholder model to provide a join table between jobs and skill
 */
class JobSkill extends Model {
  static get tableName() {
    return 'job_skill';
  }

  static get idColumn() {
    return ['job_post_id', 'skill_id'];
  }
}

module.exports = JobSkill;
