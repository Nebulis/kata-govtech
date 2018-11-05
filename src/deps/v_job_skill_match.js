const knex = require('./db');

exports.matchedSkillsScore = (trx, skills, columns = []) => {
  return trx
    .select(
      columns.concat([
        knex.raw(`(SUM(CASE WHEN skill in (:skills) THEN 1 END)/COUNT(skill)) as matched_skills_score`, {skills}),
      ]),
    )
    .from('skill')
    .innerJoin('job_skill', 'job_skill.skill_id', 'skill.id');
};
