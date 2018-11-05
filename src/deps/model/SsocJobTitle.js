const {Model, compose, snakeCaseMappers} = require('objection');

function ssocJobTitleQueryBuilderMixin(Model) {
  class SsocJobTitleQueryBuilder extends Model.QueryBuilder {
    /**
     * Does a join to the icmsJobTitles model to only return non blacklist icmsJobTitles
     * @return {SsocJobTitleQueryBuilder} An instance of the querybuilder that can be continued to be chained
     */
    nonBlacklistIcmsJobTitle() {
      return this.joinRelation('[icmsJobTitles(nonBlacklist)]');
    }

    /**
     * Does a filter on job title
     * @param {String} jobTitle
     * @return {SsocJobTitleQueryBuilder} An instance of the querybuilder that can be continued to be chained
     */
    withJobTitle(jobTitle) {
      if (jobTitle) {
        return this.where('ssoc_title', jobTitle);
      } else {
        return this;
      }
    }
  }

  return class extends Model {
    static get QueryBuilder() {
      return SsocJobTitleQueryBuilder;
    }
  };
}

const mixins = compose(ssocJobTitleQueryBuilderMixin);

class SsocJobTitle extends mixins(Model) {
  static get tableName() {
    return 'ssoc_job_titles';
  }

  static get idColumn() {
    return 'ssoc';
  }

  static get columnNameMappers() {
    return snakeCaseMappers();
  }

  static get relationMappings() {
    // Import models
    const IcmsJobTitle = require('./IcmsJobTitle');
    return {
      icmsJobTitles: {
        relation: Model.ManyToManyRelation,
        modelClass: IcmsJobTitle,
        join: {
          from: 'ssoc_job_titles.ssoc',
          through: {
            from: 'icms_ssoc.ssoc',
            to: 'icms_ssoc.icms_index',
          },
          to: 'icms_job_titles.icms_index',
        },
      },
    };
  }

  /**
   * Retrieve ICMS job titles
   * @param {Object} SsocJobTitleRequestOptions
   * @param {String} SsocJobTitleRequestOptions.jobTitle Exact string to get ICMS Job titles by
   * @return {QueryBuilder<SsocJobTitle>} A QueryBuilder that resolves to an array of one SsocJobTitle object
   */
  static getSsocJobTitles({jobTitle} = {}) {
    return SsocJobTitle.query().withJobTitle(jobTitle);
  }
}

module.exports = SsocJobTitle;
