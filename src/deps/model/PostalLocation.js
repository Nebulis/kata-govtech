const {compose, Model, snakeCaseMappers} = require('objection');

class PostalLocationQueryBuilder extends Model.QueryBuilder {
  /**
   * Does a filter on origin
   * @param {Object} origin E.g `{lat: 1.282903 , lng: 103.850173}`
   * @param {Float} origin.lat Latitude of origin
   * @param {Float} origin.lng Longitude of origin
   * @param {Number} radius the spatial radius (in kilometers) to filter
   * @return {PostalLocationQueryBuilder} An instance of the querybuilder that can be continued to be chained
   */
  withOrigin(origin, radius) {
    if (origin) {
      const lat = parseFloat(origin.lat);
      const lng = parseFloat(origin.lng);

      const deg2rad = (deg) => deg * (Math.PI / 180);
      const rad2deg = (rad) => rad * 57.29577951308232;
      const EARTH_RADIUS = 6371; // Radius of the earth in km

      // haversine formula
      const maxLat = lat + rad2deg(radius / EARTH_RADIUS);
      const minLat = lat - rad2deg(radius / EARTH_RADIUS);
      const maxLng = lng + rad2deg(Math.asin(radius / EARTH_RADIUS) / Math.cos(deg2rad(lat)));
      const minLng = lng - rad2deg(Math.asin(radius / EARTH_RADIUS) / Math.cos(deg2rad(lat)));

      return this.whereBetween('lat', [minLat, maxLat]).whereBetween('lng', [minLng, maxLng]);
    } else {
      return this;
    }
  }
}

function postalLocationQueryBuilderMixin(Model) {
  return class extends Model {
    static get QueryBuilder() {
      return PostalLocationQueryBuilder;
    }
  };
}

const mixins = compose(postalLocationQueryBuilderMixin);

class PostalLocation extends mixins(Model) {
  static get tableName() {
    return 'postal_location';
  }

  static get idColumn() {
    return 'postal_code';
  }

  static get columnNameMappers() {
    return snakeCaseMappers();
  }

  /**
   * Retrieve Postal codes within the given range of the given origin
   * @param {Object} PostalLocationRequestOptions
   * @param {Object} PostalLocationRequestOptions.origin E.g `{lat: 1.282903 , lng: 103.850173}`
   * @param {Float} origin.lat Latitude of origin
   * @param {Float} origin.lng Longitude of origin
   * @param {Number} PostalLocationRequestOptions.radius the spatial radius (in kilometers) to filter
   * @return {QueryBuilder<PostalLocation[]>} A QueryBuilder that resolves to an array of PostalLocation objects
   */
  static getPostalLocations({origin, radius = 1} = {}) {
    return PostalLocation.query().withOrigin(origin, radius);
  }
}

module.exports = PostalLocation;
