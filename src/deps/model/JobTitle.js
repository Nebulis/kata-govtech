const {linksMixin} = require('../objection');
const {Model, snakeCaseMappers, compose} = require('objection');

function jobTitleQueryBuilderMixin(Model) {
  class JobTitleQueryBuilder extends Model.QueryBuilder {
    /**
     * Does a join to the searchable_jobs model to only return job titles with searchable jobs
     * @return {JobTitleQueryBuilder} An instance of the querybuilder that can be continued to be chained
     */
    joinSearchableJobs() {
      return this.joinRelation('[searchableJobs]');
    }

    /**
     * Does a filter on a job title using case insensitive comparison
     * The word provided must be present in the string, no matter the position
     * @param {String} jobTitle the job title to filter with
     * @return {JobTitleQueryBuilder} An instance of the querybuilder that can be continued to be chained
     */
    withJobTitle(jobTitle) {
      if (jobTitle) {
        return this.where('job_title.job_title', 'like', '%' + jobTitle + '%');
      } else {
        return this;
      }
    }
  }

  return class extends Model {
    static get QueryBuilder() {
      return JobTitleQueryBuilder;
    }
  };
}

const mixins = compose(
  jobTitleQueryBuilderMixin,
  linksMixin,
);

class JobTitle extends mixins(Model) {
  static get tableName() {
    return 'job_title';
  }

  static get idColumn() {
    return 'id';
  }

  static get columnNameMappers() {
    return snakeCaseMappers();
  }

  static get relationMappings() {
    const SearchableJob = require('./SearchableJob');
    return {
      searchableJobs: {
        relation: Model.ManyToManyRelation,
        modelClass: SearchableJob,
        join: {
          from: 'job_title.id',
          through: {
            from: 'job_job_title.job_title_id',
            to: 'job_job_title.job_post_id',
          },
          to: 'searchable_jobs.job_post_id',
        },
      },
    };
  }

  /**
   *
   * @param {String} jobTitleId A unique identifier, JobTitle are primary key-ed by this value
   * @return {Promise} A promise that resolves to a JobTitle object
   */
  static getJobTitleById(jobTitleId) {
    return JobTitle.query()
      .findById(jobTitleId)
      .throwIfNotFound();
  }

  /**
   * Retrieves job titles that have names matching the provided string fragment
   * @param {Object} options
   * @param {String} options.stringFragment only companies with matching name will be returned
   * @param {Array} options.jobStatuses If specified, only companies with jobs that have these statuses will be returned.
   * @return {Promise} A promise that resolves to { results: [Companies], total: Number }
   */
  static getSuggestions({stringFragment}) {
    return JobTitle.query()
      .groupBy('job_title.job_title')
      .orderBy('job_title.job_title')
      .withJobTitle(stringFragment)
      .joinSearchableJobs()
      .page(0); // use this to enable paginated results. (total and results properties)
  }
}

module.exports = JobTitle;
