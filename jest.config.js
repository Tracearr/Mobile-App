module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  // Same rewrite as metro.config.js: @tracearr/translations imports its .ts sources as .js.
  moduleNameMapper: { '^(\\.{1,2}/.*)\\.js$': '$1' },
  transformIgnorePatterns: [
    'node_modules/(?!.pnpm/)(?!(@tracearr/.*|(jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|nativewind|react-native-css|@gorhom/.*|react-native-reanimated|@shopify/.*|standard-navigation))',
    'node_modules/.pnpm/(?!(@tracearr\\+|(jest-)?react-native|@react-native|expo|@expo|react-navigation|@react-navigation|@sentry\\+react-native|native-base|react-native-svg|nativewind|react-native-css|@gorhom\\+|react-native-reanimated|@shopify\\+|standard-navigation))',
  ],
};
