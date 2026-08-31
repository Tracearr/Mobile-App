module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!.pnpm/)(?!(@tracearr/.*|(jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|nativewind|react-native-css|@gorhom/.*|react-native-reanimated|@shopify/.*))',
    'node_modules/.pnpm/(?!(@tracearr\\+|(jest-)?react-native|@react-native|expo|@expo|react-navigation|@react-navigation|@sentry\\+react-native|native-base|react-native-svg|nativewind|react-native-css|@gorhom\\+|react-native-reanimated|@shopify\\+))',
  ],
};
