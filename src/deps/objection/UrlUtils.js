/**
 * @typedef {Object} PaginationRange
 * @property {Number} start the position of the first element
 * @property {Number} end the position of the last element
 *
 * @typedef {Object} Pagination
 * @property {Number} lastPage the number of the last page
 * @property {(Number|undefined)} nextPageNumber the number of the next page
 * @property {(Number|undefined)} prevPageNumber the number of the previous page
 * @property {PaginationRange} pageResultsRange elements information
 */

const qs = require('querystring');

function hrefWrap(body) {
  return {href: body};
}

function makeBasePath({protocol, headers}) {
  // using req.headers.host instead of req.hostname because node4 bug
  // https://github.com/twilio/twilio-node/issues/151
  return protocol + '://' + headers.host;
}

/**
 * @param {Object} req the request
 * @return {String} the url path of the request
 */
function getRequestPath({path}) {
  return path;
}

/**
 * Creates a full URL given the parts needed to form it, also drops the
 * page query key if the value is 0
 * @param {String} basePath Base path of the request, e.g "https://mycareersfuture.sg/"
 * @param {String} path Path after the basePath, e.g "v2/companies"
 * @param {Object} queryParams object containing the query parameters as keys and values
 * @param {Number} pageNumber page number(first/last page)
 * @return {{href}} the constructed URL
 */
function makePageLink(basePath, path, queryParams = {}, pageNumber) {
  const page = pageNumber !== undefined ? pageNumber : queryParams.page;
  let queryObj = Object.assign({}, queryParams, {page});
  if (!queryObj.page || parseInt(queryObj.page, 10) === 0) {
    delete queryObj.page;
  }
  let queryString = '';
  if (Object.keys(queryObj).length) {
    queryString = '?' + qs.stringify(queryObj);
  }
  return hrefWrap(basePath + path + queryString);
}

/**
 *
 * Compute information about pagination for collections
 * @param {Number} total total length of a collection
 * @param {Number} limit number of element to display
 * @param {Number} page page number where to start for
 * @return {Pagination} pagination information
 */
function calculatePageNumbers(total, limit, page) {
  const lastPage = total === 0 ? 0 : Math.ceil(total / limit) - 1;
  const startResult = limit * page;
  const endResult = startResult + limit - 1;
  const isOutOfRange = startResult > total;
  return {
    lastPage: lastPage,
    nextPageNumber: page < lastPage ? page + 1 : undefined,
    prevPageNumber: page > 0 ? page - 1 : undefined,
    pageResultsRange: isOutOfRange
      ? {}
      : {
          start: startResult < total ? startResult : total,
          end: endResult < total ? endResult : total,
        },
  };
}

/**
 * Creates the links object to insert into a JSON response
 * @param {String} basePath Base path of the request, e.g "https://mycareersfuture.sg/"
 * @param {String} path Path after the basePath, e.g "v2/companies"
 * @param {Object} queryParams Object with keys corresponding to query parameters
 * @param {Number} total Total number of results to calculate page numbers for
 * @param {Number} limit Results per page
 * @param {Number} page Page number to generate links for
 * @return {Object} Links object in JSON format
 */
function makeLinks({basePath, path, queryParams, total, limit, page}) {
  const {lastPage, nextPageNumber, prevPageNumber} = calculatePageNumbers(total, limit, page);
  return Object.assign(
    {}, // Conditional object keys
    nextPageNumber !== undefined && {next: makePageLink(basePath, path, queryParams, nextPageNumber)},
    prevPageNumber !== undefined && {prev: makePageLink(basePath, path, queryParams, prevPageNumber)},
    {self: makePageLink(basePath, path, queryParams, page)},
    {first: makePageLink(basePath, path, queryParams, 0)},
    {last: makePageLink(basePath, path, queryParams, lastPage)},
  );
}

module.exports = {
  makeBasePath,
  makeLinks,
  makePageLink,
  calculatePageNumbers,
  hrefWrap,
  getRequestPath,
};
