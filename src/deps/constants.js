const DEFAULT_JOB_COLUMNS = [
  'jobs.*',
  'company_info.*',
  'company_info.logo_upload_path as logo_url',
  'company_info.description as company_description',
  'schemes',
  'district_ids',
  'vocational_licenses',
  'categories',
  'driving_licenses',
  'employment_types',
  'position_levels',
  'employer_name',
  'salary_type',
];

module.exports = {
  DEFAULT_JOB_COLUMNS,
};
