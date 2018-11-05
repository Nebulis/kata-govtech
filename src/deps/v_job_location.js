module.exports = (trx, column) => {
  return trx.select(column).from('postal_location');
};
