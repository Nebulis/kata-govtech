const pick = require('lodash/pick');
const knex = require('../db');
const {linksMixin, namedFiltersArgumentsMixin} = require('../objection');
const {Model, snakeCaseMappers, compose} = require('objection');
const JobSkill = require('./JobSkill');
const isEqual = require('lodash/isEqual');
const camelCase = require('lodash/camelCase');

// list of fields to never pick because they shouldn't be part of jobs model
const FIELDS_TO_OMIT = [
  'employerName',
  'postedOrganizationSsicCode',
  'postedOrganizationSsicDesc',
  'hiringOrganizationSsicCode',
  'hiringOrganizationSsicDesc',
  'hiringEmployerName',
];

const DESCRIPTION_COLUMNS = [
  'otherRequirements',
  'ssocCode',
  'workingHours',
  'numberOfVacancies',
  'applicationUrl',
  'psdUrl',
  'categories',
  'employmentTypes',
  'positionLevels',
  'status',
  'shiftPattern',
  'skills',
];

const SALARY_COLUMNS = ['minMonthlySalary', 'maxMonthlySalary', 'salary'];

const ADDRESS_COLUMNS = [
  'overseasCountry',
  'foreignAddress1',
  'foreignAddress2',
  'block',
  'street',
  'floor',
  'unit',
  'building',
  'postalCode',
  'countryCode',
  'isOverseas',
];

const METADATA_COLUMNS = [
  'jobPostId',
  'createdOn',
  'modifiedOn',
  'createdAt',
  'updatedAt',
  'updateCount',
  'totalNumberOfView',
  'newPostingDate',
  'originalPostingDate',
  'expiryDate',
  'totalNumberJobApplication',
];

const SIMPLE_SELECT_COLUMNS = ['uuid', 'job_title'];

function jobQueryBuilderMixin(Model) {
  class JobQueryBuilder extends Model.QueryBuilder {
    /**
     * Return job(s) with given uuid
     * @param {(string|string[])} uuids A item or list of items of job unique id
     * @return {JobQueryBuilder} An instance of the query builder that can be continued to be chained
     */
    withUuids(uuids) {
      if (!uuids) return this;
      return Array.isArray(uuids) ? this.findByIds(uuids) : this.findById(uuids);
    }

    /**
     * Does a join to the skills model to only return Jobs that have the given skills
     * If no skills is supplied, a join does not happen
     * see http://vincit.github.io/objection.js/#namedfilters
     * @param {Array} skills Array of skills to select, e.g [983]
     * @return {JobQueryBuilder} An instance of the querybuilder that can be continued to be chained
     */
    withSkills(skills) {
      if (skills && skills.length) {
        return this.joinRelation('[skills(withSkills)]', {
          namedFiltersArguments: {
            skills,
          },
        });
      } else {
        return this;
      }
    }

    withJobStatuses(jobStatuses) {
      if (jobStatuses && jobStatuses.length) {
        return this.applyFilter('withJobStatuses', {
          namedFiltersArguments: {
            jobStatuses,
          },
        });
      } else {
        return this;
      }
    }

    /**
     * Perform a filter on job_title. The filter is performing a strict equality
     * @param {string} jobPostId The job post id to filter with
     * @return {JobQueryBuilder} An instance of the query builder that can be continued to be chained
     */
    withJobPostId(jobPostId) {
      return jobPostId ? this.where('job_post_id', '=', `${jobPostId}`) : this;
    }

    /**
     * Return jobs with given uen
     * @param {string} uen uen of jobs
     * @return {jobs} Jobs with matching uen
     */
    withUen(uen) {
      return uen ? this.where('posted_uen', uen) : this;
    }

    /**
     * Return query page when page and limit are set
     * @param {number} page The index of the page to return. The index of the first page is 0.
     * @param {number} limit The page size
     * @return {JobQueryBuilder} An instance of the query builder that can be continued to be chained
     */
    withPage(page, limit) {
      return page !== undefined && limit !== undefined ? this.page(page, limit) : this;
    }

    /**
     * Perform a filter on job_title. The filter is
     * - case insensitive
     * - partial (match partially any string)
     * No filter is applied if title is undefined, null or empty
     * @param {string} title The title to filter with
     * @return {JobQueryBuilder} An instance of the query builder that can be continued to be chained
     */
    withTitle(title) {
      return title ? this.where('job_title', 'like', `%${title}%`) : this;
    }

    /**
     * Format Job to hide sensitive fields
     * @param {function} predicate function taking a job as input and returning a boolean. Indicates whether the model must
     * hide sensitive fields. Default to a function returning true
     * @return {JobQueryBuilder} An instance of the querybuilder that can be continued to be chained
     */
    hideSensitiveFields(predicate = () => true) {
      return this.traverse(Job, (job) => {
        if (predicate(job)) {
          job.hideSensitiveFields = true;
          if (job.isHideEmployerName) job.postedCompany = null;
          if (job.isHideHiringEmployerName || !job.isPostedOnBehalf) job.hiringCompany = null;
          if (job.isHideSalary) {
            job.maxMonthlySalary = null;
            job.minMonthlySalary = null;
            job.salaryTypeId = null;
          }
          if (job.isHideCompanyAddress) {
            job.floor = null;
            job.unit = null;
            job.building = null;
            job.block = null;
            job.street = null;
            job.postalCode = null;
            job.overseasCountry = null;
            job.foreignAddress1 = null;
            job.foreignAddress2 = null;
          }
        }
      });
    }

    /**
     * jobs simple format
     * select `uuid` and `job_title` fields
     * @return {JobQueryBuilder} An instance of the querybuilder that can be continued to be chained
     */
    simple() {
      return this.select(...SIMPLE_SELECT_COLUMNS);
    }

    /**
     * jobs full format
     * select and resolve all fields
     * @return {JobQueryBuilder} An instance of the querybuilder that can be continued to be chained
     */
    full() {
      return this.mergeEager(
        '[postedCompany, hiringCompany, categories, employmentTypes, positionLevels, status, salary, shiftPattern, skills]',
      );
    }
  }

  return class extends Model {
    static get QueryBuilder() {
      return JobQueryBuilder;
    }
  };
}

const mixins = compose(
  jobQueryBuilderMixin,
  namedFiltersArgumentsMixin,
  linksMixin,
);

class Job extends mixins(Model) {
  static get tableName() {
    return 'jobs';
  }

  static get idColumn() {
    return 'uuid';
  }

  static get columnNameMappers() {
    return snakeCaseMappers();
  }

  static get namedFilters() {
    return {
      withJobStatuses: (builder) => builder.where('job_status_id', 'in', builder.namedFiltersArguments('jobStatuses')),
      /**
       * Perform condition on jobs to check if the company is disclosable:
       * - the company must accept to display its name
       * - (is_hide_employer_name = 0 for the company posting the entry
       *   or is_hide_hiring_employer_name = 0 if it's through a third-party)
       * - the job must be active (expiry_date >= current_date). The expiry date does not hold information about time.
       *   Hence an expiry_date set to '20/01/2017' is valid until '20/01/2017 23:59:59'
       * @param {QueryBuilderBase} builder the builder to chain the query with
       * @return {QueryBuilderBase} An instance of the querybuilder that can be continued to be chained
       */
      companiesDisclosable: (builder) => {
        return builder.from(
          // has to be wrapped in another select or objection.js will add additional columns when joined
          Job.query()
            .select('posted_uen as uen', 'job_status_id')
            .where('expiry_date', '>=', knex.raw('current_date()'))
            .whereNotNull('posted_uen')
            .where('is_hide_employer_name', '=', '0')
            .union(
              Job.query()
                .select('hiring_uen as uen', 'job_status_id')
                .where('expiry_date', '>=', knex.raw('current_date()'))
                .whereNotNull('hiring_uen')
                .where('is_hide_hiring_employer_name', '=', '0'),
            )
            .as('joinedJobs'),
        );
      },
    };
  }

  static get relationMappings() {
    const Skill = require('./Skill');
    const Company = require('./Company');
    const Category = require('./Category');
    const EmploymentType = require('./EmploymentType');
    const PositionLevel = require('./PositionLevel');
    const SearchableJob = require('./SearchableJob');
    const JobStatus = require('./JobStatus');
    const SalaryType = require('./SalaryType');
    const ShiftPattern = require('./ShiftPattern');

    return {
      postedCompany: {
        relation: Model.BelongsToOneRelation,
        modelClass: Company,
        join: {
          from: 'jobs.posted_uen',
          to: 'company_info.uen',
        },
      },
      hiringCompany: {
        relation: Model.BelongsToOneRelation,
        modelClass: Company,
        join: {
          from: 'jobs.hiring_uen',
          to: 'company_info.uen',
        },
      },
      skills: {
        relation: Model.ManyToManyRelation,
        modelClass: Skill,
        join: {
          from: 'jobs.job_post_id',
          through: {
            from: 'job_skill.job_post_id',
            to: 'job_skill.skill_id',
            modelClass: JobSkill,
            extra: ['confidence'],
          },
          to: 'skill.id',
        },
      },
      categories: {
        relation: Model.ManyToManyRelation,
        modelClass: Category,
        join: {
          from: 'jobs.job_post_id',
          through: {
            from: 'job_category.job_post_id',
            to: 'job_category.category_id',
          },
          to: 'categories.id',
        },
      },
      employmentTypes: {
        relation: Model.ManyToManyRelation,
        modelClass: EmploymentType,
        join: {
          from: 'jobs.job_post_id',
          through: {
            from: 'job_employment_type.job_post_id',
            to: 'job_employment_type.employment_type_id',
          },
          to: 'employment_types.id',
        },
      },
      positionLevels: {
        relation: Model.ManyToManyRelation,
        modelClass: PositionLevel,
        join: {
          from: 'jobs.job_post_id',
          through: {
            from: 'job_position.job_post_id',
            to: 'job_position.position_id',
          },
          to: 'position_levels.id',
        },
      },
      searchableJob: {
        relation: Model.HasOneRelation,
        modelClass: SearchableJob,
        join: {
          from: 'jobs.uuid',
          to: 'searchable_jobs.uuid',
        },
      },
      status: {
        relation: Model.BelongsToOneRelation,
        modelClass: JobStatus,
        join: {
          from: 'jobs.job_status_id',
          to: 'job_statuses.id',
        },
      },
      salary: {
        relation: Model.BelongsToOneRelation,
        modelClass: SalaryType,
        join: {
          from: 'jobs.salary_type_id',
          to: 'salary_types.id',
        },
      },
      shiftPattern: {
        relation: Model.BelongsToOneRelation,
        modelClass: ShiftPattern,
        join: {
          from: 'jobs.job_shift_pattern_id',
          to: 'job_shift_patterns.id',
        },
      },
    };
  }

  /**
   * perform sanitization and format of jobs
   * @param {object} json JSON job
   * @return {object} Stripped job
   */
  $formatJson(json) {
    const model = super.$formatJson(json);
    // if available keys are only SIMPLE_SELECT_COLUMNS and eventually _links, that means the .simple function has
    // been called and the representation must only contains those keys
    // Must use camel case for comparison as we use snakeCaseMappers
    if (
      isEqual(Object.keys(model), [...SIMPLE_SELECT_COLUMNS.map(camelCase), '_links']) ||
      isEqual(Object.keys(model), SIMPLE_SELECT_COLUMNS.map(camelCase))
    ) {
      return {
        title: model.jobTitle,
        uuid: model.uuid,
        _links: model._links,
      };
    }

    const {uuid, postedCompany, hiringCompany, hideSensitiveFields, isHideSalary, isHideCompanyAddress} = model;
    const description = pick(model, DESCRIPTION_COLUMNS);
    const address = pick(model, ADDRESS_COLUMNS);
    const metadata = pick(model, METADATA_COLUMNS);
    const {minMonthlySalary: minimum, maxMonthlySalary: maximum, salary} = pick(model, SALARY_COLUMNS);

    return {
      uuid,
      sourceCode: model.jobSourceCode,
      title: model.jobTitle,
      description: model.jobDescription,
      minimumYearsExperience: model.minYearsExperience,
      shiftPattern: model.jobShiftPatternId,
      ...description,
      postedCompany,
      hiringCompany,
      address:
        hideSensitiveFields && isHideCompanyAddress
          ? null
          : {
              ...address,
              // transform from 0-1 to bool
              isOverseas: !!address.isOverseas,
            },
      metadata: {
        ...metadata,
        // transform from 0-1 to bool
        isPostedOnBehalf: !!model.isPostedOnBehalf,
        isHideSalary: !!model.isHideSalary,
        isHideCompanyAddress: !!model.isHideCompanyAddress,
        isHideHiringEmployerName: !!model.isHideHiringEmployerName,
        isHideEmployerName: !!model.isHideEmployerName,
      },
      salary: hideSensitiveFields && isHideSalary ? null : {maximum, minimum, type: salary},
      _links: model._links,
    };
  }

  static getJobById(uuid) {
    return Job.query()
      .findById(uuid)
      .full()
      .omit(Job, FIELDS_TO_OMIT)
      .throwIfNotFound();
  }

  /**
   * Retrieve jobs
   * @param {Object} JobRequestOptions
   * @param {string} [JobRequestOptions.uen] A Unique Entity Number, Companies are primary key-ed by this value
   * @param {string[]} [JobRequestOptions.uuids] A Unique job id or an array of unique job id
   * @param {string} [JobRequestOptions.skills] Array of skill ids
   * @param {string} [JobRequestOptions.jobStatuses] Array of job status ids
   * @param {number} [JobRequestOptions.limit] Maximum number of results to retrieve
   * @param {number} [JobRequestOptions.page] Nth page to start from, index starts from 0.
   * @param {string} [JobRequestOptions.orderBy] the column name to order with.
   * @param {string} [JobRequestOptions.orderDirection] the direction to apply for the order.
   * @return {QueryBuilder} Returns a QueryBuilder object that can be chained with more methods or resolved to an array of Jobs
   */
  static getJobs({
    uen,
    uuids,
    skills,
    jobStatuses,
    page,
    limit,
    orderBy = 'uuid',
    orderDirection = 'asc',
    title,
    jobPostId,
  } = {}) {
    return Job.query()
      .omit(Job, FIELDS_TO_OMIT)
      .withUuids(uuids)
      .withSkills(skills)
      .withJobStatuses(jobStatuses)
      .withJobPostId(jobPostId)
      .withUen(uen)
      .withPage(page, limit)
      .withTitle(title)
      .orderBy(orderBy, orderDirection)
      .orderBy('jobs.job_post_id', 'desc');
  }
}

module.exports = Job;
