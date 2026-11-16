/* eslint-env jest */
global.IS_REACT_ACT_ENVIRONMENT = true;

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
  isAvailableAsync: jest.fn(async () => true),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => undefined),
  removeItem: jest.fn(async () => undefined),
}));

// lucide-react-native ships ESM that Jest does not transform; tests never assert on icons.
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

// English strings, the same as the app's fallback when the device language fails to load.
beforeAll(() => require('@tracearr/translations/mobile').initI18n({ lng: 'en' }));
