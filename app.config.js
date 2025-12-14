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
    plugins: [
      // Keep existing plugins but update expo-maps with API key from env
      ...baseConfig.expo.plugins.map((plugin) => {
        // Handle expo-maps plugin
        if (Array.isArray(plugin) && plugin[0] === 'expo-maps') {
          return [
            'expo-maps',
            {
              ...plugin[1],
              android: {
                ...plugin[1]?.android,
                // Inject Google Maps API key from EAS secrets or env var
                googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || '',
              },
            },
          ];
        }
        return plugin;
      }),
    ],
  };
};
