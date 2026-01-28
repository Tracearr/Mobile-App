import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Check if a URL points to a local/internal address that won't be reachable
 * from a mobile device outside the local network.
 *
 * Detects:
 * - localhost / 127.x.x.x (loopback)
 * - 10.x.x.x (Class A private)
 * - 172.16.x.x - 172.31.x.x (Class B private)
 * - 192.168.x.x (Class C private)
 * - ::1 (IPv6 loopback)
 * - fe80:: (IPv6 link-local)
 */
export function isInternalUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();

    // Localhost variants
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
      return true;
    }

    // IPv4 private ranges
    const ipv4Match = hostname.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
    if (ipv4Match) {
      const [, a, b] = ipv4Match.map(Number);
      // 10.x.x.x
      if (a === 10) return true;
      // 172.16.x.x - 172.31.x.x
      if (a === 172 && b !== undefined && b >= 16 && b <= 31) return true;
      // 192.168.x.x
      if (a === 192 && b === 168) return true;
      // 127.x.x.x (loopback range)
      if (a === 127) return true;
    }

    // IPv6 link-local
    if (hostname.startsWith('fe80:') || hostname.startsWith('[fe80:')) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}
