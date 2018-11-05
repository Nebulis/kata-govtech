const crypto = require('crypto');
const ERROR_DESCRIPTIONS = require('./lib/error_descriptions');
const {BAD_REQUEST} = require('http-status-codes');

function md5(string) {
  return crypto
    .createHash('md5')
    .update(string)
    .digest('hex');
}

function descriptionFromTag(tag) {
  let desc = ERROR_DESCRIPTIONS[tag];
  if (!desc) {
    desc = ERROR_DESCRIPTIONS['DEFAULT'];
  }
  return desc;
}

module.exports = (res, err, tag) => {
  let error = {};

  if (err instanceof Error) {
    if (err.name) {
      error.name = err.name;
    }
    if (err.message) {
      error.message = err.message;
    }
    if (err.stack) {
      error.stack = err.stack;
    }
  } else if (err) {
    error.message = err.toString();
    error.name = 'Error';
    error.code = err.code;
  } else {
    error.message = 'An undefined error has occurred. Please define error message in the code.';
    error.name = 'Error';
  }

  const description = descriptionFromTag(tag);
  error.tag = tag;
  error.info = description.info;
  error.internalRef = description.internalRef;
  error.timestamp = Date.now();
  error.caseId = md5(JSON.stringify(error));
  try {
    error.url = res.socket.parser.incoming.url;
  } catch (ex) {
    console.error(ex);
  }
  // Logs the full error to console.
  console.error(error);

  // If http response is expected, sends back pruned error.
  if (res) {
    const prunedError = {
      info: error.info,
      internalRef: error.internalRef,
      caseId: error.caseId,
    };
    res.status(BAD_REQUEST).send(prunedError);
  }

  return error;
};
