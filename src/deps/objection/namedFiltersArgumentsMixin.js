/**
 * Objection.js mixin @see {@link http://vincit.github.io/objection.js/#plugins} to pass values to named filters.
 * It extends the joinRelation method to provide a way to pass values to namedFilters and it provides a new function
 * <b>namedFiltersArguments</b> to get those values from any builder.
 *
 * To use, just call the joinRelation method and pass in options, in a property called <b>namedFiltersArguments</b>,
 * values to be used by the name filters. <b>namedFiltersArguments</b> must be an object.
 * Then in the builder, just use the function namedFiltersArguments('key') to get the values, by using the keys,
 * in the <b>namedFiltersArguments</b> object.
 *
 * The implementation has been adapted to be compatible with @see {@link mergeJoinRelationMixin}. This mixin
 * change the operation created by the joinRelation so passing the values to the context must be done when building the
 * request (by using the <b>runBefore</b> method. Otherwise values passed with <b>mergeJoinRelation</b> method won't
 * be pass to the context.
 *
 * @example
 *
 * class Python extends namedFiltersArgumentsMixin(Model) { ... }
 * class Golang extends namedFiltersArgumentsMixin(Model) {
 *   static get namedFilters() {
 *     // builder.namedFiltersArguments('some') will be resolve to 'valueOfSome', see below for usage in query)
 *     companiesDisclosable: (builder) => builder.where('things', '=', builder.namedFiltersArguments('some')),
 *   }
 * }
 *
 * const namedFiltersArguments = {some: 'valueOfSome'};
 * Python.query().joinRelation('golang', {namedFiltersArguments});
 * @param {Model} Model to extend
 * @return {Model} a new extended model
 */
function namedFiltersArgumentsMixin(Model) {
  class NamedFiltersArgumentsQueryBuilder extends Model.QueryBuilder {
    joinRelation(expression, args) {
      const relationBuilder = super.joinRelation(expression, args);
      const operation = this._operations[this._operations.length - 1]; // get the operation created by joinRelation
      this.runBefore((_, builder) => {
        if (operation.callOpt && operation.callOpt.namedFiltersArguments) {
          builder.mergeContext({namedFiltersArguments: operation.callOpt.namedFiltersArguments});
        }
      });
      return relationBuilder;
    }

    applyFilter(expression, args) {
      this.mergeContext({namedFiltersArguments: args.namedFiltersArguments});
      return super.applyFilter(expression);
    }

    namedFiltersArguments(filterName) {
      return (this.context().namedFiltersArguments || {})[filterName];
    }
  }

  return class extends Model {
    static get QueryBuilder() {
      return NamedFiltersArgumentsQueryBuilder;
    }
  };
}

module.exports = namedFiltersArgumentsMixin;
