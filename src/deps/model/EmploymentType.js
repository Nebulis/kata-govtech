const {Model, compose, snakeCaseMappers} = require('objection');

function employmentTypeQueryBuilderMixin(Model) {
  class EmploymentTypeQueryBuilder extends Model.QueryBuilder {
    /**
     * Does a join to the searchable_jobs model to only return employment types of searchable jobs
     * @return {EmploymentTypeQueryBuilder} An instance of the querybuilder that can be continued to be chained
     */
    joinSearchableJobs() {
      return this.joinRelation('[searchableJobs]');
    }

    /**
     * Does a filter on employment type name
     * @param {String[]} employmentTypes Array of exact string that is the employment type to search by, e.g 'Freelance'
     * @return {EmploymentTypeQueryBuilder} An instance of the querybuilder that can be continued to be chained
     */
    withEmploymentType(employmentTypes) {
      if (employmentTypes) {
        return this.whereIn('employment_type', employmentTypes);
      } else {
        return this;
      }
    }
  }

  return class extends Model {
    static get QueryBuilder() {
      return EmploymentTypeQueryBuilder;
    }
  };
}

const mixins = compose(employmentTypeQueryBuilderMixin);

class EmploymentType extends mixins(Model) {
  static get tableName() {
    return 'employment_types';
  }

  static get idColumn() {
    return 'id';
  }

  static get columnNameMappers() {
    return snakeCaseMappers();
  }

  static get relationMappings() {
    // Import models
    const SearchableJob = require('./SearchableJob');
    return {
      searchableJobs: {
        relation: Model.ManyToManyRelation,
        modelClass: SearchableJob,
        join: {
          from: 'employment_types.id',
          through: {
            from: 'job_employment_type.employment_type_id',
            to: 'job_employment_type.job_post_id',
          },
          to: 'searchable_jobs.job_post_id',
        },
      },
    };
  }

  /**
   * Retrieves employment types by the provided array of exact string. Returns all employment types if no string is provided.
   * @param {Object} EmploymentTypeRequestOptions
   * @param {String[]} EmploymentTypeRequestOptions.employmentTypes Array of exact string that is the employment type to search by, e.g 'Freelance'
   * @return {QueryBuilder<EmploymentType[]>} A QueryBuilder that resolves to an array of one EmploymentType object
   */
  static getEmploymentTypes({employmentTypes} = {}) {
    return EmploymentType.query().withEmploymentType(employmentTypes);
  }
}

module.exports = EmploymentType;
