/**
 * URL and token validation utilities for pairing flow
 */
import { Alert } from 'react-native';

// Re-export isInternalUrl for convenience (full implementation in utils.ts)
export { isInternalUrl } from './utils';

interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate server URL format and accessibility
 */
export function validateServerUrl(url: string): ValidationResult {
  if (!url.trim()) {
    return { valid: false, error: 'Server URL is required' };
  }

  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { valid: false, error: 'URL must start with http:// or https://' };
    }
    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
}

/**
 * Validate pairing token format (basic check)
 */
export function validateToken(token: string): ValidationResult {
  if (!token.trim()) {
    return { valid: false, error: 'Pairing token is required' };
  }
  if (token.length < 10) {
    return { valid: false, error: 'Token appears too short' };
  }
  return { valid: true };
}

/**
 * Show warning dialog for internal/local network URLs
 * Returns 'continue' if user wants to proceed, 'cancel' otherwise
 */
export function showInternalUrlWarning(): Promise<'continue' | 'cancel'> {
  return new Promise((resolve) => {
    Alert.alert(
      'Internal URL Detected',
      'This appears to be a local network address that may not work outside your home network.\n\nSet an External URL in Settings → General on your Tracearr web dashboard to enable remote access.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => resolve('cancel'),
        },
        {
          text: 'Continue Anyway',
          onPress: () => resolve('continue'),
        },
      ]
    );
  });
}
