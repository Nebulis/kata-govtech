const makeBasePath = require('./UrlUtils').makeBasePath;
const interpolateUrl = require('string-format');
const {makeLinks, hrefWrap, getRequestPath} = require('./UrlUtils');
const {findSwaggerPathForModel, findSwaggerRelationsForModel} = require('./SwaggerUtils');
const {mapValues, get} = require('lodash');

function linksMixin(Model) {
  /*
    This class extends Model.QueryBuilder with withLinks(req, options)
    and overrides Model.$afterGet() to inject _links into individual model objects
    withLinks() generates the page links if the requested result is paginated
    options will be a reusable object that accpets a property (predicate).
    And, links resolution will be based on the outcome of the predicate
    If option is not provided, it will default to returning the relation provided in Objection.js

    @example:
    option = {
      relationsPredicate: {
        // show the company link if uen of the company is not null and individual flag is set as false
        postedCompany: (model) => model.postedUen !== null && !model.isHideEmployerName,
        hiringCompany: (model) => model.hiringUen !== null && !model.isHideHiringEmployerName,
      }
    }
    Each property of the options should be a predicate.
    If predicate is true, it will thus return link for the postedCompany.
   */
  class LinksQueryBuilder extends Model.QueryBuilder {
    withLinks(req, options) {
      this.mergeContext({req, linksMixinOptions: options});

      /*
        runAfter(b) registers b to be run after the results are
        returned from the query execution
       */
      this.runAfter((results) => {
        if (results && Array.isArray(results.results)) {
          const makeLinksParams = {
            basePath: makeBasePath(req),
            path: req.path,
            queryParams: req.query,
            total: results.total,
            limit: req.swagger.params.limit.value,
            page: req.swagger.params.page.value,
          };
          results._links = makeLinks(makeLinksParams);
        }

        return results;
      });

      return this;
    }

    /*
      Makes it so that using .pick() doesn't remove the _links
     */
    pick(modelClass, properties) {
      if (typeof properties === 'undefined') {
        properties = modelClass;
        modelClass = null;
      }
      properties.push('_links');
      return super.pick(modelClass, properties);
    }
  }

  // http://vincit.github.io/objection.js/#plugin-development-best-practices
  return class extends Model {
    static get QueryBuilder() {
      return LinksQueryBuilder;
    }

    /*
      We're overriding Model.$afterGet() so that we inject _links into the returned model objects
     */
    $afterGet(queryContext) {
      super.$afterGet(queryContext);
      const {req, linksMixinOptions} = queryContext;
      // swaggerDefinitionPath looks something like '/companies/{uen}'
      if (req) {
        let swaggerDefinitionPath = findSwaggerPathForModel(req, this);
        // url of the current model for instance for skills can be /v2/skills/5
        const modelPath = interpolateUrl(swaggerDefinitionPath, this);
        // url path that initiated the query
        const originalPath = getRequestPath(req);

        // a sub resource of the model is an url that starts with the modelPath but is different
        // for instance /v2/skills/5/jobs is a subResource of /v2/skills/5 whereas /v2/jobs/10 is not
        const isSubResource = modelPath !== originalPath && originalPath.includes(modelPath);

        // selfPath must be equal to the originalPath for sub-resources, otherwise use the modelPath
        const selfPath = isSubResource ? originalPath : modelPath;
        this._links = {
          self: hrefWrap(makeBasePath(req) + selfPath),
        };

        // dont compute relations for sub-resources
        if (!isSubResource) {
          let swaggerDefinitionRelations = findSwaggerRelationsForModel(req, this);
          for (const {from, to, path, name, resolve} of swaggerDefinitionRelations) {
            const relationName = name || findRelationInModel(this, from, to);
            if (relationName) {
              const model = {
                ...this,
                ...mapValues(resolve, (property) => this[property]),
              };
              const predicate = get(linksMixinOptions, `relationsPredicate[${relationName}]`, () => true);
              if (predicate(model)) {
                this._links[relationName] = hrefWrap(makeBasePath(req) + interpolateUrl(path, model));
              }
            }
          }
        }
      }
    }
  };
}

/**
 * Find a relation between modelFrom and modelTo in model class
 * @param {Model}model the model class holding the relations
 * @param {String} modelFrom the model owner of the relation
 * @param {String} modelTo the target model of the relation
 * @return {String} the relation name or empty string if not found
 */
function findRelationInModel(model, modelFrom, modelTo) {
  const modelRelations = model.constructor.getRelations();
  for (const relation in modelRelations) {
    if (
      modelRelations[relation].ownerModelClass.name === modelFrom &&
      modelRelations[relation].relatedModelClass.name === modelTo
    ) {
      return relation;
    }
  }
  console.warn(`Couldn't find the relation between ${modelFrom} and ${modelTo} in ${model.constructor.name}`);
  return '';
}

module.exports = linksMixin;
