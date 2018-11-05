const {Model} = require('objection');
const knex = require('./deps/db');
const formatter = require('./deps/formatter');
const errorHandler = require('./deps/error_handler');
const viewJobSkill = require('./deps/v_job_skill');
const viewSkillsMatched = require('./deps/v_job_skill_match');

let jobsView = require('./deps/v_jobs');
const SearchableJob = require('./deps/model/SearchableJob');

const {getCache, checkIsThirdParty} = require('./deps/redis');
const getJobsByJobTitle = (req, res, next) => {
  const limit = req.swagger.params.limit.value;
  const page = req.swagger.params.page.value;
  const expectedSalary = req.swagger.params.salary.value;
  const employmentType = req.swagger.params.employmentType.value;
  const skills = req.swagger.params.skills.value;
  const sortBy = req.swagger.params.sortBy.value;
  const positionLevels = req.swagger.params.positionLevel.value;
  const districts = req.swagger.params.districts.value;
  const category = req.swagger.params.category.value;
  const postingCompany = req.swagger.params.postingCompany.value;
  const company = (req.swagger.params.company.value || '').trim().replace(/\'/g, '');
  const schemes = req.swagger.params.schemes.value;
  const uuid = req.swagger.params.uuid.value;
  const geolocation = req.swagger.params.geolocation.value;
  const search = (req.swagger.params.search.value || '').trim().replace(/\"/g, '');
  const fromDate = req.swagger.params.fromDate.value;

  // the boolean to cater for search with no job title
  const isSearchPresent = search.length > 0;

  const filters = {
    search,
    expectedSalary,
    company,
    employmentTypes: employmentType && [employmentType],
    positionLevels,
    districts,
    categories: category && [category],
    postingCompany,
    schemes,
    fromDate,
    geolocation,
  };

  // the sort columns determines the order of which the job list is being returned.
  const sortColumns = (sortBy || [])
    .concat((geolocation && company && ['exact_employer_name']) || []) // move to companies endpoint
    .concat((geolocation && uuid && ['exact_uuid']) || []) // move to /job/{job-post-id} endpoint
    .concat(
      isSearchPresent // if there is a search string sort by these
        ? [
            'hidden_name',
            'exact_string_score',
            'job_title_score',
            'exact_company_score',
            'company_name_score',
            'matched_skills_score',
            'job_description_score',
            'new_posting_date',
            'job_post_id',
          ]
        : ['hidden_name', 'matched_skills_score', 'new_posting_date', 'job_post_id'], // no search string sort by these
    );

  const columns = [
    'presumed_salary',
    'is_hide_salary', // [#153953782] - Undisclosed salary need to be sorted to the bottom
  ].concat(sortColumns);

  const materializedView = SearchableJob.withoutSnakecaseMappers()
    .search(filters)
    .select(
      Array.from(new Set(columns)).map((column) => {
        switch (column) {
          case 'exact_uuid':
            return knex.raw(`CASE WHEN ?? = '${uuid || 0}' THEN 1 ELSE 0 END AS exact_uuid`, ['uuid']);
          case 'exact_employer_name':
            return knex.raw(`CASE WHEN ?? = '${company}' THEN 1 ELSE 0 END AS exact_employer_name`, ['employer_name']);
          case 'hidden_name':
            return knex.raw('CASE WHEN ?? = 0 AND ?? = 1 THEN 0 ELSE 1 END AS hidden_name', [
              'is_posted_on_behalf',
              'is_hide_employer_name',
            ]);
          case 'presumed_salary':
            return knex.raw('CASE WHEN ?? IS NULL THEN ?? ELSE ?? END AS presumed_salary', [
              'max_monthly_salary',
              'min_monthly_salary',
              'max_monthly_salary',
            ]);
          case 'matched_skills_score':
            return skills
              ? viewSkillsMatched
                  .matchedSkillsScore(knex, skills)
                  .where({job_post_id: knex.raw('searchable_jobs.job_post_id')})
                  .as('matched_skills_score')
              : knex.raw('NULL as matched_skills_score');
          case 'exact_string_score':
            return knex.raw(
              `(MATCH (job_title) AGAINST
            (? IN BOOLEAN MODE) > 0) AS exact_string_score`,
              `"${search}"`,
            );
          case 'job_title_score':
            return knex.raw(
              `(MATCH (job_title) AGAINST
            (? IN BOOLEAN MODE) > 0) AS job_title_score`,
              search
                .split(' ')
                .map((word) => `+"${word}"`)
                .join(' '),
            );
          case 'job_description_score':
            return knex.raw(
              `MATCH (job_title, job_description) AGAINST
            (? IN NATURAL LANGUAGE MODE) AS job_description_score`,
              search
                .split(' ')
                .map((word) => `"${word}"`)
                .join(' '),
            );
          case 'exact_company_score':
            return knex.raw(
              `(MATCH (employer_name) AGAINST
          (? IN BOOLEAN MODE) > 0) AS exact_company_score`,
              `"${search}"`,
            );
          case 'company_name_score':
            return knex.raw(
              `(MATCH (employer_name) AGAINST
          (? IN BOOLEAN MODE) > 0) AS company_name_score`,
              search
                .split(' ')
                .map((word) => `+"${word}"`)
                .join(' '),
            );

          default:
            return column;
        }
      }),
    );

  if (expectedSalary) {
    materializedView.havingNotNull('presumed_salary');
  }

  const statement = sortColumns.reduce((concated, orderColumn) => {
    switch (orderColumn) {
      case 'schemes':
        return concated.orderByRaw('?? is not null desc', orderColumn);
      case 'min_monthly_salary':
        // Undisclosed salary at the bottom when sort by salary
        return concated.orderBy('is_hide_salary').orderBy(orderColumn, 'desc');
      default:
        return concated.orderBy(orderColumn, 'desc');
    }
  }, materializedView.clone());
  const pagedView = statement.page(page, limit);
  const resultPromise = pagedView.then((results) => ({
    jobs: results.results,
    count: results.total,
  }));

  Promise.all([
    resultPromise.then((results) => {
      const jobPostIds = results.jobs.map((job) => job.job_post_id);
      const defaultColumns = [
        'uuid',
        'jobs.job_post_id',
        'employer_name',
        'new_posting_date',
        'original_posting_date',
        'expiry_date',
        'job_title',
        'min_years_experience',
        'min_monthly_salary',
        'max_monthly_salary',
        'district_ids',
        'employment_types',
        'position_levels',
        'schemes',
        'job_description',
        'total_number_job_application',
        'created_on',
        'modified_on',
        'total_number_of_view',
        'company_info.description as company_description',
        'company_info.logo_upload_path as logo_url',
        'hiring_employer_name',
        'is_posted_on_behalf',
        'is_hide_employer_name',
        'is_hide_hiring_employer_name',
        'is_hide_salary',
        'salary_type',
        'categories',
      ];
      const locationColumns = ['uuid', 'jobs.job_post_id', 'employer_name', 'job_title', 'postal_code', 'lat', 'lng'];
      const selectColumns = geolocation ? locationColumns : defaultColumns;

      return jobsView(knex, selectColumns)
        .leftJoin('company_info', 'jobs.posted_uen', 'company_info.uen')
        .whereIn('jobs.job_post_id', jobPostIds)
        .then((jobsWithDetail) => {
          const jobs = results.jobs.map((job) => {
            const jobDetails = jobsWithDetail.find((detail) => detail.job_post_id === job.job_post_id);
            return Object.assign({}, job, jobDetails);
          });
          return Object.assign({}, results, {jobs});
        })
        .then((jobsWithDetail) => {
          return viewJobSkill(knex, jobPostIds).then((skills) => {
            const jobs = jobsWithDetail.jobs.map((job) => {
              return Object.assign({}, formatter.hideJobFields(job), skills[job.job_post_id]);
            });
            return Object.assign({}, jobsWithDetail, {jobs});
          });
        });
    }),
    Model.query()
      .count('* as totalCount')
      .from(SearchableJob.search({geolocation, search, company}).as('query')),
    Model.query()
      .count('* as schemeCount')
      .from(materializedView.withSchemes(true).as('query')),
  ])
    .then((results) => {
      const jsonRes = Object.assign(
        results[0],
        {countWithoutFilters: results[1][0].totalCount},
        {countWithSchemes: results[2][0].schemeCount},
      );
      res.json(jsonRes);
      if (res.locals) {
        res.locals.jsonRes = jsonRes;
      }
      if (next) {
        next();
      }
    })
    .catch((error) => {
      console.log(error)
      errorHandler(res, error, 'getJobsByJobTitle');
    });
};

module.exports = (req, res, next) =>
  getCache({checkFunc: checkIsThirdParty})(req, res, () => getJobsByJobTitle(req, res, next));
