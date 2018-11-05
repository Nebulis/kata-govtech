const crypto = require('crypto');
const {get} = require('lodash');

const getHash = (req) => {
  return crypto
    .createHash('md5')
    .update(req.originalUrl)
    .digest('hex');
};

module.exports = {
  getCache: ({checkFunc}) => async (req, res, next) => {
    if (checkFunc === undefined || checkFunc(req)) {
      const md5Hash = getHash(req);
      const data = await getData(md5Hash);
      if (data !== null) {
        return res.json(data);
      }
    }
    next();
  },
  setCache: ({checkFunc}) => (req, res, next) => {
    if (checkFunc === undefined || checkFunc(req)) {
      const jsonRes = get(res, 'locals.jsonRes', null);
      if (jsonRes !== null) {
        const md5Hash = getHash(req);
        setData(md5Hash, jsonRes);
      }
    }
    next();
  },
  checkIsThirdParty: (req) => {
    return false;
  },
};
