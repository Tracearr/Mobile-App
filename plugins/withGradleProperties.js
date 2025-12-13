const { withGradleProperties } = require('expo/config-plugins');

/**
 * Config plugin to customize Android gradle.properties
 * Used to set JVM memory args for builds with many native dependencies
 */
module.exports = function withCustomGradleProperties(config, props) {
  return withGradleProperties(config, (config) => {
    for (const [key, value] of Object.entries(props)) {
      const existingIndex = config.modResults.findIndex(
        (p) => p.type === 'property' && p.key === key
      );

      if (existingIndex !== -1) {
        config.modResults[existingIndex].value = value;
      } else {
        config.modResults.push({
          type: 'property',
          key,
          value,
        });
      }
    }
    return config;
  });
};
