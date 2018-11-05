const {Model, compose} = require('objection');

function schemeQueryBuilderMixin(Model) {
  class SchemeQueryBuilder extends Model.QueryBuilder {
    /**
     * Does a join to the searchable_jobs model to only return Schemes of searchable jobs
     * @return {SchemeQueryBuilder} An instance of the querybuilder that can be continued to be chained
     */
    joinSearchableJobs() {
      return this.joinRelation('[searchableJobs]');
    }
  }

  return class extends Model {
    static get QueryBuilder() {
      return SchemeQueryBuilder;
    }
  };
}

const mixins = compose(schemeQueryBuilderMixin);

class Scheme extends mixins(Model) {
  static get tableName() {
    return 'schemes';
  }

  static get idColumn() {
    return 'id';
  }

  static get relationMappings() {
    // Import models
    const SearchableJob = require('./SearchableJob');
    return {
      searchableJobs: {
        relation: Model.ManyToManyRelation,
        modelClass: SearchableJob,
        join: {
          from: 'schemes.id',
          through: {
            from: 'job_scheme.scheme_id',
            to: 'job_scheme.job_post_id',
          },
          to: 'searchable_jobs.job_post_id',
        },
      },
    };
  }
}

module.exports = Scheme;
