/**
 * Dynamic Expo config that extends app.json
 * Allows injecting secrets from environment variables at build time
 */

const baseConfig = require('./app.json');

module.exports = ({ config }) => {
  // Merge base config with dynamic values
  return {
    ...baseConfig.expo,
    ...config,
    android: {
      ...baseConfig.expo.android,
      config: {
        ...baseConfig.expo.android?.config,
        googleMaps: {
          apiKey: process.env.GOOGLE_MAPS_API_KEY || '',
        },
      },
    },
  };
};
