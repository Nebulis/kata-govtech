const stopwords = [
  {value: 'a'},
  {value: 'about'},
  {value: 'an'},
  {value: 'are'},
  {value: 'as'},
  {value: 'at'},
  {value: 'be'},
  {value: 'by'},
  {value: 'com'},
  {value: 'de'},
  {value: 'en'},
  {value: 'for'},
  {value: 'from'},
  {value: 'how'},
  {value: 'i'},
  {value: 'in'},
  {value: 'is'},
  // {value: 'it'}, remove from stopwords, as it might be relevant to Information Technology
  {value: 'la'},
  {value: 'of'},
  {value: 'on'},
  {value: 'or'},
  {value: 'that'},
  {value: 'the'},
  {value: 'this'},
  {value: 'to'},
  {value: 'was'},
  {value: 'what'},
  {value: 'when'},
  {value: 'where'},
  {value: 'who'},
  {value: 'will'},
  {value: 'with'},
  {value: 'und'},
  {value: 'the'},
  {value: 'www'},
  {value: 'senior'},
  {value: 'junior'},
  {value: 'assistants'},
  {value: 'assistant'},
  {value: 'asst'},
  {value: 'snr'},
  {value: 'sr'},
];
exports.stopwords = stopwords;

exports.seed = (knex, Promise) => {
  return knex('fulltext_index_custom_stopwords')
    .select('value')
    .then((values) => {
      const newStopwords = stopwords.filter((word) => {
        return !values.some((value) => value.value === word.value);
      });
      if (newStopwords.length > 0) {
        console.log('Loading Fulltext Index stopwords');
        return knex('fulltext_index_custom_stopwords')
          .insert(newStopwords)
          .then(() => {
            return knex.schema
              .raw('DROP INDEX job_title_index ON searchable_jobs')
              .raw('DROP INDEX job_search_index ON searchable_jobs')
              .raw('CREATE FULLTEXT INDEX job_title_index ON searchable_jobs(job_title)')
              .raw('CREATE FULLTEXT INDEX job_search_index ON searchable_jobs(job_title, job_description)');
          });
      } else {
        return new Promise((resolve, reject) => {
          resolve();
        });
      }
    });
};
