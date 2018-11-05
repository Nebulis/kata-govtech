const chai = require('chai');
chai.use(require('sinon-chai'));
chai.use(require('chai-as-promised'));
global.expect = chai.expect;
global.sinon = require('sinon');
const knex = require('./deps/db');
const Model = require('objection').Model;
const mockKnex = require('mock-knex');
const tracker = require('mock-knex').getTracker();

Model.knex(knex);

// close knex connections after each tests
after((done) => {
  knex.destroy(done);
});

module.exports = {
  mockDb: () => mockKnex.mock(knex),
  unmockDb: () => mockKnex.unmock(knex),
  tracker,
};
