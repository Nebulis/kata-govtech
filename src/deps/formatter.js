const sanitizeHtml = require('sanitize-html');
const he = require('he');
const defaultTo = require('lodash/defaultTo');

/**
 * @constant
 * @type {string[]}
 */
exports.ALLOWED_HTML_TAGS = [
  'b',
  'br',
  'blockquote',
  'button',
  'caption',
  'cite',
  'code',
  'col',
  'colgroup',
  'del',
  'div',
  'em',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'hr',
  'i',
  'label',
  'li',
  'ol',
  'p',
  'q',
  'small',
  'strong',
  'sub',
  'sup',
  'table',
  'tbody',
  'td',
  'th',
  'u',
  'ul',
];

exports.hideJobFields = (job) => {
  if (typeof job !== 'object' || !job) {
    return job;
  }
  let newJob = Object.assign({}, job);
  if (newJob.is_hide_employer_name === 1) {
    newJob.employer_name = null;
    newJob.logo_upload_path = null;
    newJob.logo_file_name = null;
    newJob.logo_url = null;
  }
  if (newJob.is_hide_hiring_employer_name === 1) {
    newJob.hiring_employer_name = null;
  }
  if (newJob.is_hide_salary === 1) {
    newJob.max_monthly_salary = null;
    newJob.min_monthly_salary = null;
    newJob.salary_type = null;
  }
  if (newJob.is_hide_company_address === 1) {
    newJob.district_ids = null;
    newJob.building = null;
    newJob.block = null;
    newJob.street = null;
    newJob.postal_code = null;
    newJob.overseas_country = null;
    newJob.foreign_address1 = null;
    newJob.foreign_address2 = null;
  }
  return newJob;
};
