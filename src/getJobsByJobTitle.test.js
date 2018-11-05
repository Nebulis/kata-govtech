const proxyquire = require('proxyquire');
const getJobsByJobTitle = proxyquire('./getJobsByJobTitle', {
  './deps/error_handler': (res, err, tag) => {
    return res.error({err, tag});
  },
});
const {mockDb, tracker, unmockDb} = require('./helpers');

describe('api/controllers/job/getJobsByJobTitle', () => {
  before(() => {
    mockDb();
  });

  after(() => {
    unmockDb();
  });
  let queryFromTracker = '';
  const mockJobsResult = [{job_post_id: 'job 1'}, {job_post_id: 'job 2'}, {job_post_id: 'job 3'}, {job_post_id: '...'}];
  const expectedJobsResult = {
    jobs: [
      {
        job_post_id: 'job 1',
        skills: [{id: 1, skill: 'skill 1'}, {id: 2, skill: 'skill 2'}, {id: 3, skill: 'skill 3'}],
      },
      {
        job_post_id: 'job 2',
        skills: [{id: 1, skill: 'skill 1'}, {id: 2, skill: 'skill 2'}],
      },
      {
        job_post_id: 'job 3',
        skills: [{id: 3, skill: 'skill 3'}],
      },
      {
        job_post_id: '...',
        skills: [{id: 2, skill: 'skill 2'}, {id: 0, skill: '...'}],
      },
    ],
    count: 267,
    countWithoutFilters: 109876,
    countWithSchemes: 123,
  };
  beforeEach(() => {
    tracker.install();
    // dont rely on the order of queries as we use async all along
    // please never do that again
    tracker.on('query', (query) => {
      if (query.sql.includes('count(*) as `totalCount`')) {
        query.response([{totalCount: 109876}]);
      } else if (query.sql.includes('count(*) as `schemeCount`')) {
        query.response([{schemeCount: 123}]);
      } else if (query.sql.includes('count(*) as `count`')) {
        query.response([{count: 267}]);
      } else if (query.sql.includes('from `searchable_jobs`')) {
        query.response([{schemeCount: 123}]);
        query.response(mockJobsResult);
        queryFromTracker = query;
      } else if (query.sql.includes('from `jobs`')) {
        query.response(mockJobsResult);
      } else if (query.sql.includes('from `job_skill`')) {
        query.response([
          {job_post_id: 'job 1', id: 1, skill: 'skill 1'},
          {job_post_id: 'job 1', id: 2, skill: 'skill 2'},
          {job_post_id: 'job 1', id: 3, skill: 'skill 3'},
          {job_post_id: 'job 2', id: 1, skill: 'skill 1'},
          {job_post_id: 'job 2', id: 2, skill: 'skill 2'},
          {job_post_id: 'job 3', id: 3, skill: 'skill 3'},
          {job_post_id: '...', id: 2, skill: 'skill 2'},
          {job_post_id: '...', id: 0, skill: '...'},
        ]);
      } else query.reject();
    });
  });
  afterEach(() => {
    queryFromTracker = '';
    tracker.uninstall();
  });

  const defaultRequest = {
    swagger: {
      params: {
        limit: {value: 20},
        page: {value: 0},
        salary: {value: 0},
        employmentType: {value: ''},
        skills: {value: []},
        sortBy: {value: []},
        positionLevel: {value: []},
        districts: {value: []},
        category: {value: ''},
        postingCompany: {value: ''},
        company: {value: ''},
        schemes: {value: false},
        search: {value: 'DEFAULT_SEARCH_VALUE'},
        fromDate: {value: ''},
        geolocation: {value: undefined},
        uuid: {value: ''},
      },
    },
  };

  const newRequest = (values) => {
    let req = Object.assign({}, defaultRequest);

    Object.keys(values).forEach((key) => {
      req.swagger.params[key] = {value: values[key]};
    });
    return req;
  };

  /** *************************************************************************************************
   *                            _____          _     __ _             _                                *
   *                           /__   \___  ___| |_  / _\ |_ __ _ _ __| |_                              *
   *                             / /\/ _ \/ __| __| \ \| __/ _` | '__| __|                             *
   *                            / / |  __/\__ \ |_  _\ \ || (_| | |  | |_                              *
   *                            \/   \___||___/\__| \__/\__\__,_|_|   \__|                             *
   *                                                                                                   *
   ****************************************************************************************************/
  describe('filters', () => {
    describe('search', () => {
      it('should perform empty search', (done) => {
        const search = '';
        const req = newRequest({search});
        const res = {
          json: (payload) => {
            expect(queryFromTracker.sql).to.not.include('MATCH (job_title');
            expect(queryFromTracker.sql).to.not.include('exact_string_score');
            expect(queryFromTracker.sql).to.not.include('job_title_score');
            expect(queryFromTracker.sql).to.not.include('job_description_score');
            expect(payload).to.eql(expectedJobsResult);
            done();
          },
        };
        getJobsByJobTitle(req, res);
      });

      it('should perform full text search with string', (done) => {
        const search = 'SOFTWARE ENGINEER';
        const req = newRequest({search});
        const res = {
          json: () => {
            expect(queryFromTracker.sql).to.include('MATCH (job_title');
            expect(queryFromTracker.sql).to.include('exact_string_score');
            expect(queryFromTracker.sql).to.include('job_title_score');
            expect(queryFromTracker.sql).to.include('job_description_score');

            // binding for Fulltext index
            // double quote (") characters scores only rows that contain the exact phrase
            // plus sign (+) this word must be present
            expect(queryFromTracker.bindings).to.include(search);
            expect(queryFromTracker.bindings).to.include(`"${search}"`, 'jobTitle is not matched with exact phrase');
            expect(queryFromTracker.bindings).to.include(
              '"SOFTWARE" "ENGINEER"',
              'fulltext index operator is not encapsulate by quote to remove its operator effects',
            );
            expect(queryFromTracker.bindings).to.include(
              '+"SOFTWARE" +"ENGINEER"',
              'each search phrase must present in jobTitle',
            );
            done();
          },
        };
        getJobsByJobTitle(req, res);
      });

      it('should sanitise quote(")', (done) => {
        const search = '/"+Software Engineer';
        const req = newRequest({search});
        const res = {
          json: () => {
            expect(queryFromTracker.bindings).to.include('/+Software Engineer');
            expect(queryFromTracker.bindings).to.include('"/+Software" "Engineer"');
            expect(queryFromTracker.bindings).to.include('"/+Software Engineer"');
            done();
          },
        };
        getJobsByJobTitle(req, res);
      });
    });

    describe('salary', () => {
      it('should include salary when set', (done) => {
        const salary = 2888;
        const req = newRequest({salary});

        const res = {
          json: () => {
            expect(queryFromTracker.sql).to.include(
              '(`max_monthly_salary` >= ? and `is_hide_salary` = ? or `max_monthly_salary` is null)',
            );
            expect(queryFromTracker.sql).to.include('having `presumed_salary` is not null');
            expect(queryFromTracker.bindings).to.include(salary);
            done();
          },
        };
        getJobsByJobTitle(req, res);
      });

      it('should not include salary when set to 0', (done) => {
        const salary = 0;
        const req = newRequest({salary});

        const res = {
          json: () => {
            expect(queryFromTracker.sql).to.not.include('(`max_monthly_salary` >= ? or `max_monthly_salary` is null)');
            expect(queryFromTracker.sql).to.not.include('having `presumed_salary` is not null');
            expect(queryFromTracker.bindings).to.include(salary);
            done();
          },
        };
        getJobsByJobTitle(req, res);
      });

      it('should throw when salary is invalid', (done) => {
        const salary = -1000;
        const req = newRequest({salary});

        const res = {
          error: (err, tag) => {
            expect(err).to.not.be.null;
            expect(tag).to.not.be.null;
            done();
          },
        };
        getJobsByJobTitle(req, res);
      });
    });

    describe('postingCompany', () => {
      it('should set is_posted_on_behalf when postingCompany = Direct', (done) => {
        const postingCompany = 'Direct';
        const req = newRequest({postingCompany});

        const res = {
          json: () => {
            expect(queryFromTracker.bindings).to.include(0);
            expect(queryFromTracker.sql).to.include('`is_posted_on_behalf` = ?');
            done();
          },
        };
        getJobsByJobTitle(req, res);
      });

      it('should set is_posted_on_behalf when postingCompany = Third Party', (done) => {
        const postingCompany = 'Third Party';
        const req = newRequest({postingCompany});

        const res = {
          json: () => {
            expect(queryFromTracker.bindings).to.include(1);
            expect(queryFromTracker.sql).to.include('`is_posted_on_behalf` = ?');
            done();
          },
        };
        getJobsByJobTitle(req, res);
      });
    });

    describe('company', () => {
      it('should include company when set', (done) => {
        const company = 'ABC Pte. Ltd.';
        const req = newRequest({company});

        const res = {
          json: () => {
            expect(queryFromTracker.bindings).to.include(`%${company}%`);
            expect(queryFromTracker.sql).to.include('`employer_name` like ?');
            done();
          },
        };
        getJobsByJobTitle(req, res);
      });

      it('should not include company when not set', (done) => {
        const company = '';
        const req = newRequest({company});

        const res = {
          json: () => {
            expect(queryFromTracker.bindings).to.not.include(`%${company}%`);
            expect(queryFromTracker.sql).to.not.include('`employer_name` like ?');
            done();
          },
        };
        getJobsByJobTitle(req, res);
      });
    });

    describe('employmentType', () => {
      it('should include employmentType when set', (done) => {
        const employmentType = 'Part Time';
        const req = newRequest({employmentType});

        const res = {
          json: () => {
            expect(queryFromTracker.bindings).to.include('Part Time');
            expect(queryFromTracker.sql).to.include('`employment_type` in (?)');
            done();
          },
        };
        getJobsByJobTitle(req, res);
      });

      it('should not include employmentType when not set', (done) => {
        const employmentType = '';
        const req = newRequest({employmentType});

        const res = {
          json: () => {
            expect(queryFromTracker.bindings).to.not.include('Part Time');
            expect(queryFromTracker.sql).to.not.include('`employment_type` in (?)');
            done();
          },
        };
        getJobsByJobTitle(req, res);
      });
    });

    describe('category', () => {
      it('should include category when set', (done) => {
        const category = 'Others';
        const req = newRequest({category});

        const res = {
          json: () => {
            expect(queryFromTracker.bindings).to.include('Others');
            expect(queryFromTracker.sql).to.include('`category` in (?)');
            done();
          },
        };
        getJobsByJobTitle(req, res);
      });

      it('should throw when category is empty', (done) => {
        const category = '';
        const req = newRequest({category});

        const res = {
          error: (err, tag) => {
            expect(err).to.not.be.null;
            expect(tag).to.not.be.null;
            done();
          },
        };
        getJobsByJobTitle(req, res);
      });
    });

    describe('limit & page', () => {
      it('should include limit and offset when limit and page is set', (done) => {
        const limit = 12;
        const page = 5;
        const offset = limit * page;
        const req = newRequest({limit, page});

        const res = {
          json: () => {
            expect(queryFromTracker.sql).to.include('limit ? offset ?');
            expect(queryFromTracker.bindings).to.include.members([limit, offset]);
            done();
          },
        };
        getJobsByJobTitle(req, res);
      });
    });

    describe('schemes', () => {
      it('should filter by government scheme when set', (done) => {
        const schemes = true;
        const req = newRequest({schemes});
        const res = {
          json: () => {
            expect(queryFromTracker.sql).to.include('`job_post_id` from `schemes` inner join `job_scheme`');
            done();
          },
        };
        getJobsByJobTitle(req, res);
      });

      it('should not filter by government scheme when not set', (done) => {
        const schemes = false;
        const req = newRequest({schemes});
        const res = {
          json: () => {
            expect(queryFromTracker.sql).to.not.include('`job_post_id` from `job_scheme`');
            done();
          },
        };
        getJobsByJobTitle(req, res);
      });
    });

    describe('positionLevel', () => {
      it('should include multiple positionLevel when set', (done) => {
        const positionLevel = ['Manager', 'Fresh/entry level'];
        const req = newRequest({positionLevel});
        const res = {
          json: () => {
            expect(queryFromTracker.bindings).to.include.members(['Manager', 'Fresh/entry level']);
            expect(queryFromTracker.sql).to.include('`position` in (?, ?)');
            done();
          },
        };
        getJobsByJobTitle(req, res);
      });

      it('should throw when positionLevel is invalid', (done) => {
        const positionLevel = '';
        const req = newRequest({positionLevel});

        const res = {
          error: (err, tag) => {
            expect(err).to.not.be.null;
            expect(tag).to.not.be.null;
            done();
          },
        };
        getJobsByJobTitle(req, res);
      });
    });

    describe('district', () => {
      it('should include district when set', (done) => {
        const districts = ['1', '2'];
        const req = newRequest({districts});
        const res = {
          json: () => {
            expect(queryFromTracker.bindings).to.include.members(['1', '2']);
            expect(queryFromTracker.sql).to.include('`districts`.`id` in (?, ?)');
            done();
          },
        };
        getJobsByJobTitle(req, res);
      });

      it('should not include district when not set', (done) => {
        const districts = '';
        const req = newRequest({districts});
        const res = {
          json: () => {
            expect(queryFromTracker.sql).to.not.include('`district_id` in (?)');
            done();
          },
          error: console.log,
        };
        getJobsByJobTitle(req, res);
      });
    });

    describe('skills', () => {
      it('should include skills when set', (done) => {
        const skills = ['SKILL_1', 'SKILL_2', 'SKILL_3'];
        const req = newRequest({skills});
        const res = {
          json: () => {
            expect(queryFromTracker.bindings).to.include(skills);
            expect(queryFromTracker.sql).to.contain(`skill in (?)`);
            expect(queryFromTracker.sql).to.contain('COUNT(skill)');
            done();
          },
        };
        getJobsByJobTitle(req, res);
      });

      it('should not include skills when not set', (done) => {
        const skills = '';
        const req = newRequest({skills});
        const res = {
          json: () => {
            expect(queryFromTracker.bindings).to.not.include(skills);
            expect(queryFromTracker.sql).to.not.contain(`skill in (?)`);
            expect(queryFromTracker.sql).to.not.contain('COUNT(skill)');
            done();
          },
        };
        getJobsByJobTitle(req, res);
      });
    });
  });
  describe('sort', () => {
    const defaultSort =
      '`hidden_name` desc, ' +
      '`exact_string_score` desc, ' +
      '`job_title_score` desc, ' +
      '`exact_company_score` desc, ' +
      '`company_name_score` desc, ' +
      '`matched_skills_score` desc, ' +
      '`job_description_score` desc, ' +
      '`new_posting_date` desc, ' +
      '`job_post_id` desc';
    describe('default', () => {
      it('should use default sorting order', (done) => {
        const req = newRequest({});
        const res = {
          json: () => {
            expect(queryFromTracker.sql).to.contain('order by ' + defaultSort);
            done();
          },
        };
        getJobsByJobTitle(req, res);
      });
    });

    describe('new_posting_date', () => {
      it('should sort by new_posting_date first', (done) => {
        const sortBy = ['new_posting_date'];
        const req = newRequest({sortBy});
        const res = {
          json: () => {
            expect(queryFromTracker.sql).to.contain('order by `new_posting_date` desc, ' + defaultSort);
            done();
          },
        };
        getJobsByJobTitle(req, res);
      });
    });

    describe('min_monthly_salary', () => {
      it('should sort by min_monthly_salary first', (done) => {
        const sortBy = ['min_monthly_salary'];
        const req = newRequest({sortBy});
        const res = {
          json: () => {
            expect(queryFromTracker.sql).to.contain(
              'order by `is_hide_salary` asc, `min_monthly_salary` desc, ' + defaultSort,
            );
            done();
          },
        };
        getJobsByJobTitle(req, res);
      });
    });

    describe('schemes', () => {
      it('should sort by schemes first', (done) => {
        const sortBy = ['schemes'];
        const req = newRequest({sortBy});
        const res = {
          json: () => {
            expect(queryFromTracker.sql).to.contain('order by `schemes` is not null desc, ' + defaultSort);
            done();
          },
        };
        getJobsByJobTitle(req, res);
      });
    });

    describe('schemes and min_monthly_salary', () => {
      it('should sort by schemes first, then min_monthly_salary', (done) => {
        const sortBy = ['schemes', 'min_monthly_salary'];
        const req = newRequest({sortBy});
        const res = {
          json: () => {
            expect(queryFromTracker.sql).to.contain(
              'order by `schemes` is not null desc, `is_hide_salary` asc, `min_monthly_salary` desc, ' + defaultSort,
            );
            done();
          },
          error: console.log,
        };
        getJobsByJobTitle(req, res);
      });
    });

    describe('empty search string sort', () => {
      it('should not sort by non-existent fields', (done) => {
        const search = '';
        const req = newRequest({search});
        const res = {
          json: () => {
            expect(queryFromTracker.sql).to.not.contain('exact_company_score');
            expect(queryFromTracker.sql).to.not.contain('company_name_score');
            expect(queryFromTracker.sql).to.not.contain('exact_string_score');
            expect(queryFromTracker.sql).to.not.contain('job_title_score');
            expect(queryFromTracker.sql).to.not.contain('job_description_score');
            done();
          },
          error: console.log,
        };
        getJobsByJobTitle(req, res);
      });
    });

    describe('fromDate criteria', () => {
      it('should show jobs posted after fromDate with respect to updated_at field', (done) => {
        const fromDate = '2017-09-07T08:10:43.397Z';
        const req = newRequest({fromDate});
        const res = {
          json: () => {
            expect(queryFromTracker.sql).to.contain('updated_at');
            expect(queryFromTracker.bindings).to.contain(fromDate);
            done();
          },
          error: console.log,
        };
        getJobsByJobTitle(req, res);
      });
    });

    describe('geolocation criteria', () => {
      it("should sanitise apostrophe(') in company", (done) => {
        const geolocation = ['1.29464636950479', '103.859724355499'];
        const company = "'foo";
        const req = newRequest({company, geolocation});
        const res = {
          json: () => {
            expect(queryFromTracker.sql).to.contain("'foo'");
            done();
          },
          error: console.log,
        };
        getJobsByJobTitle(req, res);
      });

      it('should show jobs within a defined map boundary with geolocation as center', (done) => {
        const geolocation = ['1.29464636950479', '103.859724355499'];
        const req = newRequest({geolocation});
        const res = {
          json: () => {
            expect(queryFromTracker.sql).to.contain('`lat` between ? and ?');
            expect(queryFromTracker.sql).to.contain('`lng` between ? and ?');
            expect(queryFromTracker.sql).to.not.include('exact_uuid');
            done();
          },
          error: console.log,
        };
        getJobsByJobTitle(req, res);
      });

      it('should show job with uuid sorted to the top', (done) => {
        const geolocation = ['1.29464636950479', '103.859724355499'];
        const uuid = '123456';
        const req = newRequest({geolocation, uuid});
        const res = {
          json: () => {
            expect(queryFromTracker.sql).to.contain('`lat` between ? and ?');
            expect(queryFromTracker.sql).to.contain('`lng` between ? and ?');
            expect(queryFromTracker.sql).to.contain('exact_uuid');
            done();
          },
          error: console.log,
        };
        getJobsByJobTitle(req, res);
      });
    });
  });
});
