module.exports = {
  DEFAULT: {
    internalRef: 99999,
    info: 'An unknown error has occured',
  },
  TEST: {
    internalRef: 99998,
    info: 'TEST ERROR MESSAGE',
  },
  getJobById: {
    internalRef: 101,
    info: 'Job cannot be found',
  },
  getJobsByJobTitle: {
    internalRef: 102,
    info: 'Problem finding relevant jobs',
  },
  autocompleteSkills: {
    internalRef: 104,
    info: 'Fail to return relevant skills',
  },
  jobTitleToSkills: {
    internalRef: 105,
    info: 'Fail to get skills from job title',
  },
  skillsToJobs: {
    internalRef: 106,
    info: 'Fail to get jobs',
  },
  incrementJobPostViewCount: {
    internalRef: 107,
    info: 'Cannot increase job post count',
  },
  getPopularJobTitles: {
    internalRef: 107,
    info: 'Cannot find popular jobs',
  },
  getInDemandJobTitles: {
    internalRef: 107,
    info: 'Cannot find in demand jobs',
  },
  queryTooShort3: {
    internalRef: 109,
    info: 'Query must be at least 3 character long',
  },
};
