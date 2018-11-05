const {Model, compose} = require('objection');

function positionLevelQueryBuilderMixin(Model) {
  class PositionLevelQueryBuilder extends Model.QueryBuilder {
    /**
     * Does a join to the searchable_jobs model to only return Position Levels of searchable jobs
     * @return {PositionLevelQueryBuilder} An instance of the querybuilder that can be continued to be chained
     */
    joinSearchableJobs() {
      return this.joinRelation('[searchableJobs]');
    }

    /**
     * Does a filter on position level name
     * @param {String[]} positionLevels Array of exact strings to match for retrieving position level
     * @return {PositionLevelQueryBuilder} An instance of the querybuilder that can be continued to be chained
     */
    withPositionLevels(positionLevels) {
      if (positionLevels) {
        return this.whereIn('position', positionLevels);
      } else {
        return this;
      }
    }
  }

  return class extends Model {
    static get QueryBuilder() {
      return PositionLevelQueryBuilder;
    }
  };
}

const mixins = compose(positionLevelQueryBuilderMixin);

class PositionLevel extends mixins(Model) {
  static get tableName() {
    return 'position_levels';
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
          from: 'position_levels.id',
          through: {
            from: 'job_position.position_id',
            to: 'job_position.job_post_id',
          },
          to: 'searchable_jobs.job_post_id',
        },
      },
    };
  }

  /**
   * Retrieve Position Levels by the provided strings. If no string is supplied all position levels are returned
   * @param {Object} PositionLevelRequestOptions
   * @param {String[]} PositionLevelRequestOptions.positionLevels Array of exact strings to match for retrieving position level
   * @return {QueryBuilder<PositionLevel[]>} A QueryBuilder that resolves to an array of one or many PositionLevel objects
   */
  static getPositionLevels({positionLevels} = {}) {
    return PositionLevel.query().withPositionLevels(positionLevels);
  }
}

module.exports = PositionLevel;
