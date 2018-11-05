module.exports = (trx, jobPostIds) => {
  return trx
    .select(['job_post_id', 'skill.id', 'skill.skill'])
    .from('job_skill')
    .leftJoin('skill', 'job_skill.skill_id', 'skill.id')
    .whereIn('job_post_id', jobPostIds)
    .orderBy('confidence', 'desc')
    .reduce((aggregate, row) => {
      if (!Object.prototype.hasOwnProperty.call(aggregate, row.job_post_id)) {
        aggregate[row.job_post_id] = {skills: []};
      }
      aggregate[row.job_post_id].skills.push({id: row.id, skill: row.skill});
      return aggregate;
    }, {});
};
