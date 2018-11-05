const {Model, compose} = require('objection');

function categoryQueryBuilderMixin(Model) {
  class CategoryQueryBuilder extends Model.QueryBuilder {
    /**
     * Does a join to the searchable_jobs model to only return categories of searchable jobs
     * @return {CategoryQueryBuilder} An instance of the querybuilder that can be continued to be chained
     */
    joinSearchableJobs() {
      return this.joinRelation('[searchableJobs]');
    }

    /**
     * Does a filter on category name
     * @param {String[]} categories the array of exact categories strings to filter with
     * @return {CategoryQueryBuilder} An instance of the querybuilder that can be continued to be chained
     */
    withCategories(categories) {
      if (categories) {
        return this.whereIn('category', categories);
      } else {
        return this;
      }
    }
  }

  return class extends Model {
    static get QueryBuilder() {
      return CategoryQueryBuilder;
    }
  };
}

const mixins = compose(categoryQueryBuilderMixin);

class Category extends mixins(Model) {
  static get tableName() {
    return 'categories';
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
          from: 'categories.id',
          through: {
            from: 'job_category.category_id',
            to: 'job_category.job_post_id',
          },
          to: 'searchable_jobs.job_post_id',
        },
      },
    };
  }

  /**
   * Retrieves Category objects by the provided categories string. Returns all categories if no string is provided
   * @param {Object} CategoryRequestOptions
   * @param {String[]} CategoryRequestOptions.categories the array of exact categories string to retrieve Category object
   * @return {QueryBuilder<Category[]>} A QueryBuilder that resolves to an array of one Category object
   */
  static getCategories({categories} = {}) {
    return Category.query().withCategories(categories);
  }
}

module.exports = Category;
