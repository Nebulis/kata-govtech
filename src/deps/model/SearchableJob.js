const {compose, Model, snakeCaseMappers} = require('objection');
const JobTitle = require('./JobTitle');
const Category = require('./Category');
const EmploymentType = require('./EmploymentType');
const PositionLevel = require('./PositionLevel');
const District = require('./District');
const Scheme = require('./Scheme');
const IcmsJobTitle = require('./IcmsJobTitle');
const SsocJobTitle = require('./SsocJobTitle');
const PostalLocation = require('./PostalLocation');
const excludeFullTextIndexStopWord = require('./excludeFullTextIndexStopWord');

class SearchableJobQueryBuilder extends Model.QueryBuilder {
  /**
   * Does a search on job title, job description, employer name, ssoc/icms job title
   * @param {String} search the search term to filter with
   * @return {SearchableJobQueryBuilder} An instance of the querybuilder that can be continued to be chained
   */
  withSearchText(search) {
    if (search) {
      const fullTextIndexableWords = excludeFullTextIndexStopWord(search);
      return this.where((self) => {
        self
          .whereRaw(`MATCH (job_title, job_description) AGAINST (? IN BOOLEAN MODE)`, `"${search}"`)
          .orWhereRaw(
            `MATCH (job_title) AGAINST (? IN BOOLEAN MODE)`,
            fullTextIndexableWords.map((word) => `+"${word}"`).join(' '),
          )
          .orWhere((self) => {
            self
              .where('is_hide_employer_name', 0)
              .whereRaw(
                `MATCH (employer_name) AGAINST (? IN BOOLEAN MODE)`,
                fullTextIndexableWords.map((word) => `+"${word}"`).join(' '),
              );
          })
          .orWhereIn(
            'job_post_id',
            JobTitle.query()
              .select('searchableJobs.job_post_id')
              .joinSearchableJobs()
              .where({'job_title.job_title': search}),
          )
          .orWhereIn(
            'searchable_jobs.ssoc_code',
            IcmsJobTitle.getIcmsJobTitles({jobTitle: search}).select('icms_index'),
          )
          .orWhereIn(
            'searchable_jobs.ssoc_code',
            SsocJobTitle.getSsocJobTitles({jobTitle: search})
              .select('icmsJobTitles.icms_index')
              .nonBlacklistIcmsJobTitle(),
          );
      });
    } else {
      return this;
    }
  }

  /**
   * Does a filter base on max_monthly_salary
   * @param {Number} expectedSalary
   * @return {SearchableJobQueryBuilder} An instance of the querybuilder that can be continued to be chained
   */
  withExpectedSalary(expectedSalary) {
    if (expectedSalary) {
      return this.where((self) => {
        self
          .where('max_monthly_salary', '>=', expectedSalary)
          .andWhere('is_hide_salary', 0)
          .orWhereNull('max_monthly_salary');
      });
    } else {
      return this;
    }
  }

  /**
   * Does a filter base on is_posted_on_behalf
   * @param {String[]} postingCompany posted by 'Direct' and/or 'Third Party'
   * @return {SearchableJobQueryBuilder} An instance of the querybuilder that can be continued to be chained
   */
  withPostingCompany(postingCompany) {
    const directOnly = postingCompany && postingCompany.indexOf('Direct') >= 0;
    const thirdPartyOnly = postingCompany && postingCompany.indexOf('Third Party') >= 0;
    if (directOnly !== thirdPartyOnly) {
      return this.where('is_posted_on_behalf', '=', directOnly ? 0 : 1);
    } else {
      return this;
    }
  }

  /**
   * Does a filter base on employment_types
   * @param {String[]} employmentTypes
   * @return {SearchableJobQueryBuilder} An instance of the querybuilder that can be continued to be chained
   */
  withEmploymentTypes(employmentTypes) {
    if (employmentTypes) {
      return this.whereIn(
        'job_post_id',
        EmploymentType.getEmploymentTypes({employmentTypes})
          .select('searchableJobs.job_post_id')
          .joinSearchableJobs(),
      );
    } else {
      return this;
    }
  }

  /**
   * Does a filter base on position_levels
   * @param {String[]} positionLevels
   * @return {SearchableJobQueryBuilder} An instance of the querybuilder that can be continued to be chained
   */
  withPositionLevels(positionLevels) {
    if (positionLevels) {
      return this.whereIn(
        'job_post_id',
        PositionLevel.getPositionLevels({positionLevels})
          .select('searchableJobs.job_post_id')
          .joinSearchableJobs(),
      );
    } else {
      return this;
    }
  }

  /**
   * Does a filter base on job_district
   * @param {Number[]} districtIds
   * @return {SearchableJobQueryBuilder} An instance of the querybuilder that can be continued to be chained
   */
  withDistricts(districtIds) {
    if (districtIds) {
      return this.whereIn(
        'job_post_id',
        District.getDistricts({districtIds})
          .select('searchableJobs.job_post_id')
          .joinSearchableJobs(),
      );
    } else {
      return this;
    }
  }

  /**
   * Does a filter base on job_category
   * @param {String[]} categories
   * @return {SearchableJobQueryBuilder} An instance of the querybuilder that can be continued to be chained
   */
  withCategories(categories) {
    if (categories) {
      return this.whereIn(
        'job_post_id',
        Category.getCategories({categories})
          .select('searchableJobs.job_post_id')
          .joinSearchableJobs(),
      );
    } else {
      return this;
    }
  }

  /**
   * Does a filter base on employer_name
   * @param {String} company company name
   * @return {SearchableJobQueryBuilder} An instance of the querybuilder that can be continued to be chained
   */
  withCompany(company) {
    if (company) {
      return this.where('employer_name', 'like', `%${company}%`);
    } else {
      return this;
    }
  }

  /**
   * Does a filter base on any scheme exist for the job
   * @param {Boolean} schemes
   * @return {SearchableJobQueryBuilder} An instance of the querybuilder that can be continued to be chained
   */
  withSchemes(schemes) {
    if (schemes) {
      return this.whereIn(
        'job_post_id',
        Scheme.query()
          .select('searchableJobs.job_post_id')
          .joinSearchableJobs(),
      );
    } else {
      return this;
    }
  }

  /**
   * Does a filter on job on/after the fromDate
   * @param {String} fromDate YYYY-MM-DD
   * @return {SearchableJobQueryBuilder} An instance of the querybuilder that can be continued to be chained
   */
  withFromDate(fromDate) {
    if (fromDate) {
      return this.where('updated_at', '>=', fromDate);
    } else {
      return this;
    }
  }

  /**
   * Does a filter base on geolocation postal code
   * @param {Array} geolocation
   * @param {String} search the search term to filter with
   * @param {String} company the company name to filter with
   * @return {SearchableJobQueryBuilder} An instance of the querybuilder that can be continued to be chained
   */
  withGeolocation(geolocation, search, company) {
    if (geolocation) {
      const origin = {lat: geolocation[0], lng: geolocation[1]};
      return this.whereIn('postal_code', PostalLocation.getPostalLocations({origin}).select('postal_code')).where(
        (self) => {
          if (search && company) {
            self
              .whereRaw(`MATCH (job_title, job_description) AGAINST (? IN BOOLEAN MODE)`, `"${search}"`)
              .orWhereRaw(
                `MATCH (job_title) AGAINST (? IN BOOLEAN MODE)`,
                search
                  .split(' ')
                  .map((word) => `+"${word}"`)
                  .join(' '),
              )
              .orWhere((self) => {
                self.whereRaw(`MATCH (employer_name) AGAINST (? IN BOOLEAN MODE)`, `"${company}"`);
              });
          }
        },
      );
    } else {
      return this;
    }
  }
}

function searchableJobQueryBuilderMixin(Model) {
  return class extends Model {
    static get QueryBuilder() {
      return SearchableJobQueryBuilder;
    }
  };
}

const mixins = compose(searchableJobQueryBuilderMixin);

class SearchableJob extends mixins(Model) {
  static get tableName() {
    return 'searchable_jobs';
  }

  static get idColumn() {
    return 'uuid';
  }

  static get columnNameMappers() {
    return snakeCaseMappers();
  }

  static get namedFilters() {
    return {
      /**
       * Get all companies uen in searchable jobs
       * @param {QueryBuilderBase} builder the builder to chain the query with
       * @return {QueryBuilderBase} An instance of the querybuilder that can be continued to be chained
       */
      allUen: (builder) => {
        return builder.from(
          // has to be wrapped in another select or objection.js will add additional columns when joined
          SearchableJob.query()
            .select('posted_uen as uen')
            .whereNotNull('posted_uen')
            .union(
              SearchableJob.query()
                .select('hiring_uen as uen')
                .whereNotNull('hiring_uen'),
            )
            .as('joinedJobs'),
        );
      },
    };
  }

  static get relationMappings() {
    const Job = require('./Job');
    const JobTitle = require('./JobTitle');

    return {
      job: {
        relation: Model.HasOneRelation,
        modelClass: Job,
        join: {
          from: 'searchable_jobs.uuid',
          to: 'jobs.uuid',
        },
      },
      jobTitles: {
        relation: Model.ManyToManyRelation,
        modelClass: JobTitle,
        join: {
          from: 'searchable_jobs.job_post_id',
          through: {
            from: 'job_job_title.job_post_id',
            to: 'job_job_title.job_title_id',
          },
          to: 'job_title.id',
        },
      },
    };
  }

  // for v1 api, not to have Snake case to camel case conversion
  static withoutSnakecaseMappers() {
    return class extends SearchableJob {
      static get columnNameMappers() {
        return null;
      }
    };
  }

  /**
   * search jobs
   * @param {Object} SearchableJobRequestOptions
   * @param {String} SearchableJobRequestOptions.search the search term to filter with
   * @param {Number} SearchableJobRequestOptions.expectedSalary
   * @param {String[]} SearchableJobRequestOptions.postingCompany posted by 'Direct' and/or 'Third Party'
   * @param {String[]} SearchableJobRequestOptions.employmentTypes
   * @param {String[]} SearchableJobRequestOptions.positionLevels
   * @param {Number[]} SearchableJobRequestOptions.districts
   * @param {String[]} SearchableJobRequestOptions.categories
   * @param {String} SearchableJobRequestOptions.company company/employer name
   * @param {Boolean} SearchableJobRequestOptions.schemes filter if the job have government schemes
   * @param {String} SearchableJobRequestOptions.fromDate YYYY-MM-DD
   * @param {Array} SearchableJobRequestOptions.geolocation lat lng
   * @return {QueryBuilder} Returns a QueryBuilder object that can be chained or resolved to array of seachableJobs
   */
  static search({
    search,
    expectedSalary,
    postingCompany,
    employmentTypes,
    positionLevels,
    districts,
    categories,
    company,
    schemes,
    fromDate,
    geolocation,
  } = {}) {
    if (geolocation) {
      return this.query().withGeolocation(geolocation, search, company);
    } else {
      return this.query()
        .withSearchText(search)
        .withExpectedSalary(expectedSalary)
        .withPostingCompany(postingCompany)
        .withEmploymentTypes(employmentTypes)
        .withPositionLevels(positionLevels)
        .withDistricts(districts)
        .withCategories(categories)
        .withCompany(company)
        .withSchemes(schemes)
        .withFromDate(fromDate);
    }
  }
}

module.exports = SearchableJob;
