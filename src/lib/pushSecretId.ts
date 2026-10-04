// The server's `kid` for the secret it encrypted with. The hash is passed in
// because react-native-quick-crypto cannot load under the node test runner.
export function pushSecretId(secret: string, sha256Hex: (input: string) => string): string {
  return sha256Hex(secret).slice(0, 16);
}
