module.exports = (trx, column) => {
  return trx.select(column).from('salary_types');
};
