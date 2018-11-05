const {compose, Model, snakeCaseMappers} = require('objection');

class IcmsJobTitleQueryBuilder extends Model.QueryBuilder {
  /**
   * Does a filter on job title
   * @param {String} jobTitle Exact string to match against ICMS job titles
   * @return {IcmsJobTitleQueryBuilder} An instance of the querybuilder that can be continued to be chained
   */
  withJobTitle(jobTitle) {
    if (jobTitle) {
      return this.where('icms_title', jobTitle);
    } else {
      return this;
    }
  }
}

function icmsJobTitleQueryBuilderMixin(Model) {
  return class extends Model {
    static get QueryBuilder() {
      return IcmsJobTitleQueryBuilder;
    }
  };
}

const mixins = compose(icmsJobTitleQueryBuilderMixin);

class IcmsJobTitle extends mixins(Model) {
  static get tableName() {
    return 'icms_job_titles';
  }

  static get idColumn() {
    return 'icms_index';
  }

  static get columnNameMappers() {
    return snakeCaseMappers();
  }

  static get namedFilters() {
    return {
      nonBlacklist: (builder) => builder.where('is_blacklist', false),
    };
  }

  static get relationMappings() {
    const Job = require('./Job');

    return {
      jobs: {
        relation: Model.HasManyRelation,
        modelClass: Job,
        join: {
          from: 'icms_job_titles.icms_index',
          to: 'jobs.ssoc_code',
        },
      },
    };
  }

  /**
   * Retrieve nonBlacklist ICMS job titles by the exact provided string.
   * @param {Object} IcmsJobTitleRequestOptions
   * @param {String} IcmsJobTitleRequestOptions.jobTitle Exact string to match against ICMS job titles
   * @return {QueryBuilder<IcmsJobTitle[]>} A QueryBuilder that resolves to an array of IcmsJobTitle objects
   */
  static getIcmsJobTitles({jobTitle} = {}) {
    return IcmsJobTitle.query()
      .applyFilter('nonBlacklist')
      .withJobTitle(jobTitle);
  }
}

module.exports = IcmsJobTitle;
