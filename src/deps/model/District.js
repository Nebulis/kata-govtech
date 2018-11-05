const {Model, compose, snakeCaseMappers} = require('objection');

function districtQueryBuilderMixin(Model) {
  class DistrictQueryBuilder extends Model.QueryBuilder {
    /**
     * Does a join to the searchable_jobs model to only return Districts of searchable jobs
     * @return {DistrictQueryBuilder} An instance of the querybuilder that can be continued to be chained
     */
    joinSearchableJobs() {
      return this.joinRelation('[searchableJobs]');
    }

    /**
     * Does a filter on district ids
     * @param {Number[]} districtIds districtIds An array of one or many districtIds which are numbers
     * @return {DistrictQueryBuilder} An instance of the querybuilder that can be continued to be chained
     */
    withDistrictIds(districtIds) {
      if (districtIds) {
        return this.findByIds(districtIds);
      } else {
        return this;
      }
    }
  }

  return class extends Model {
    static get QueryBuilder() {
      return DistrictQueryBuilder;
    }
  };
}

const mixins = compose(districtQueryBuilderMixin);

class District extends mixins(Model) {
  static get tableName() {
    return 'districts';
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
          from: 'districts.id',
          through: {
            from: 'job_district.district_id',
            to: 'job_district.job_post_id',
          },
          to: 'searchable_jobs.job_post_id',
        },
      },
    };
  }

  /**
   * Retrieves District objects by the provided ids. Returns all districts if no district ID is provided
   * @param {Object} DistrictRequestOptions
   * @param {Number[]} DistrictRequestOptions.districtIds districtIds An array of one or many districtIds which are numbers
   * @return {QueryBuilder<District[]>} A QueryBuilder that resolves to an array of one or many District objects
   */
  static getDistricts({districtIds} = {}) {
    return District.query().withDistrictIds(districtIds);
  }
}

module.exports = District;
