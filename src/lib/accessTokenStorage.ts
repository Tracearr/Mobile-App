export const ACCESS_TOKEN_KEY = 'tracearr_access_token_v2';
export const LEGACY_ACCESS_TOKEN_KEY = 'tracearr_access_token';

export type TokenOptions = { accessGroup?: string };

export type TokenStore = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options?: TokenOptions): Promise<boolean>;
  remove(key: string): Promise<boolean>;
};

// A build signed without the App Groups entitlement cannot write the shared
// item; a private one keeps the app signed in and the widget on the old path.
export async function writeAccessToken(
  store: TokenStore,
  value: string,
  options: TokenOptions
): Promise<boolean> {
  if (await store.set(ACCESS_TOKEN_KEY, value, options)) return true;
  if (!options.accessGroup) return false;
  return store.set(ACCESS_TOKEN_KEY, value);
}

// The v2 key lives in the shared group; an install upgraded from the private
// key is moved on first read, and the old item goes once the new one exists.
export async function readAccessToken(
  store: TokenStore,
  options: TokenOptions
): Promise<string | null> {
  const shared = await store.get(ACCESS_TOKEN_KEY);
  const legacy = await store.get(LEGACY_ACCESS_TOKEN_KEY);
  if (legacy !== null && shared === null) {
    if (await writeAccessToken(store, legacy, options)) await store.remove(LEGACY_ACCESS_TOKEN_KEY);
    return legacy;
  }
  if (legacy !== null) await store.remove(LEGACY_ACCESS_TOKEN_KEY);
  return shared;
}
