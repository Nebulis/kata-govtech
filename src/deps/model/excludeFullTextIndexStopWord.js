const {stopwords} = require('./13_fulltext_index_stopwords');

/**
 * Take in a search string and remove those un-indexable words
 * @param {String} searchString
 * @return {String[]} an array of words that can be used for full-text index search
 */
const excludeFullTextIndexStopWord = (searchString) => {
  const stopwordsList = stopwords.map(({value}) => value);
  return searchString
    .replace(/[^\w]+/g, ' ') // full-text index only indexes word, to remove all non-word characters
    .split(' ')
    .filter((v) => v.length >= 2 && stopwordsList.indexOf(v.toLowerCase()) === -1);
};

module.exports = excludeFullTextIndexStopWord;
