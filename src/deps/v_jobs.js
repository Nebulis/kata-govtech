const knex = require('./db');
const viewJobScheme = require('./v_job_scheme');
const viewJobDistrict = require('./v_job_district');
const viewJobVocationalLicense = require('./v_job_vocational_license');
const viewJobCategory = require('./v_job_category');
const viewJobDrivingLicense = require('./v_job_driving_license');
const viewJobEmploymentType = require('./v_job_employment_type');
const viewSalaryType = require('./v_job_salary_type');
const viewJobPosition = require('./v_job_position');
const locationView = require('./v_job_location');
const {DEFAULT_JOB_COLUMNS} = require('./constants');

const jobsView = (trx, columns) => {
  const selectColumns = (columns || DEFAULT_JOB_COLUMNS).map((column) => {
    switch (column) {
      case 'schemes':
        return viewJobScheme(knex)
          .where({job_post_id: knex.raw('jobs.job_post_id')})
          .as('schemes');
      case 'district_ids':
        return viewJobDistrict(knex)
          .where({job_post_id: knex.raw('jobs.job_post_id')})
          .as('district_ids');
      case 'vocational_licenses':
        return viewJobVocationalLicense(knex)
          .where({job_post_id: knex.raw('jobs.job_post_id')})
          .as('vocational_licenses');
      case 'categories':
        return viewJobCategory(knex)
          .where({job_post_id: knex.raw('jobs.job_post_id')})
          .as('categories');
      case 'driving_licenses':
        return viewJobDrivingLicense(knex)
          .where({job_post_id: knex.raw('jobs.job_post_id')})
          .as('driving_licenses');
      case 'employment_types':
        return viewJobEmploymentType(knex)
          .where({job_post_id: knex.raw('jobs.job_post_id')})
          .as('employment_types');
      case 'position_levels':
        return viewJobPosition(knex)
          .where({job_post_id: knex.raw('jobs.job_post_id')})
          .as('position_levels');
      case 'postal_code':
        return locationView(knex, 'postal_code')
          .where({postal_code: knex.raw('jobs.postal_code')})
          .as('postal_code');
      case 'lat':
        return locationView(knex, 'lat')
          .where({postal_code: knex.raw('jobs.postal_code')})
          .as('lat');
      case 'lng':
        return locationView(knex, 'lng')
          .where({postal_code: knex.raw('jobs.postal_code')})
          .as('lng');
      case 'salary_type':
        return viewSalaryType(knex, 'salary_type')
          .where({id: knex.raw('jobs.salary_type_id')})
          .as('salary_type');
      default:
        return column;
    }
  });

  return trx.select(selectColumns).from('jobs');
};

module.exports = jobsView;
