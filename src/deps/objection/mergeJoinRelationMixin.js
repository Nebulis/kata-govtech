const {RelationExpression} = require('objection');
const {merge, findLast} = require('lodash');
const JoinRelationOperation = require('objection/lib/queryBuilder/operations/JoinRelationOperation');

/**
 * Objection.js mixin @see {@link http://vincit.github.io/objection.js/#plugins} to merge two consecutives joinRelation.
 *
 * When you perform two joinRelation, Objection.js generates two join operation.
 * That behaviour may not always be wanted.
 * The mixin is here to help to merge joinRelation, the same way mergeEager does (already available in Objection.js).
 *
 * The mixin looks for the last joinRelation available, then merges expression if such an operation is found.
 * Otherwise it will just create a new joinRelation.
 *
 * @example
 * Some.query().mergeJoinRelation('foo(a)').mergeJoinRelation('foo(b)')
 * // will be equivalent to Some.query().joinRelation('foo(a)').mergeJoinRelation('foo(b)')
 * // will be equivalent to Some.query().joinRelation('foo(a,b)')
 *
 * @param {Model} Model to extend
 * @return {Model} a new extended model
 */
function mergeJoinRelationMixin(Model) {
  class MergeJoinRelationQueryBuilder extends Model.QueryBuilder {
    mergeJoinRelation(expr, options) {
      const operations = this._operations || [];
      const joinOperation = findLast(operations, (joinOperation) => joinOperation instanceof JoinRelationOperation);
      if (!joinOperation) {
        return this.joinRelation(expr, options);
      }
      joinOperation.expression = joinOperation.expression.merge(RelationExpression.create(expr));
      joinOperation.callOpt = merge(joinOperation.callOpt, options);
      return this;
    }
  }

  return class extends Model {
    static get QueryBuilder() {
      return MergeJoinRelationQueryBuilder;
    }
  };
}

module.exports = mergeJoinRelationMixin;
