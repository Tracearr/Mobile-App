/**
 * User avatar component with image and fallback to initials
 */
import React from 'react';
import { PixelRatio, View } from 'react-native';
import { Image } from 'expo-image';
import { Text } from './text';
import { isDirectAvatarUrl, isProxiableAvatarUrl } from '@tracearr/shared';
import { getServerUrl } from '@/lib/api';

interface UserAvatarProps {
  /** User's avatar URL (can be null) - either absolute URL or relative proxy path */
  thumbUrl?: string | null;
  /** Server ID for constructing proxy URLs (required for non-Plex avatars) */
  serverId?: string | null;
  /** The person's name: the accessibility label and the initials fallback */
  name?: string | null;
  /** Size of the avatar (default: 40) */
  size?: number;
}

/**
 * Build avatar URL that goes through Tracearr's image proxy.
 * This ensures proper caching and avoids direct media server access.
 *
 * - Plex avatars from plex.tv load directly; other absolute URLs are proxied when a
 *   server type's art host serves them and dropped otherwise, as web does
 * - Already-constructed proxy URLs (start with /api/) - just prepend server URL
 * - Raw media server paths - construct full proxy URL
 */
export function buildAvatarUrl(
  thumbUrl: string,
  serverId: string | null | undefined,
  size: number
): string | null {
  const serverUrl = getServerUrl();

  if (thumbUrl.startsWith('http') && !isProxiableAvatarUrl(thumbUrl)) {
    return isDirectAvatarUrl(thumbUrl) ? thumbUrl : null;
  }

  // Already a proxy URL (from API that pre-constructs it)
  if (thumbUrl.startsWith('/api/')) {
    return serverUrl ? `${serverUrl}${thumbUrl}` : null;
  }

  // Raw media server path or proxiable absolute URL (same as web's getAvatarUrl)
  if (!serverId || !serverUrl) {
    return null;
  }

  const params = new URLSearchParams({
    server: serverId,
    url: thumbUrl,
    width: String(PixelRatio.getPixelSizeForLayoutSize(size)),
    height: String(PixelRatio.getPixelSizeForLayoutSize(size)),
    fallback: 'avatar',
  });

  return `${serverUrl}/api/v1/images/proxy?${params}`;
}

export function UserAvatar({ thumbUrl, serverId, name, size = 40 }: UserAvatarProps) {
  const initials = (name ?? '').slice(0, 2).toUpperCase();
  const fontSize = Math.max(size * 0.4, 10);
  const borderRadius = size / 2;

  if (thumbUrl) {
    const imageUrl = buildAvatarUrl(thumbUrl, serverId, size);
    if (imageUrl) {
      return (
        <Image
          source={{ uri: imageUrl }}
          accessibilityLabel={name ?? undefined}
          style={{ width: size, height: size, borderRadius }}
          className="bg-surface"
        />
      );
    }
  }

  return (
    <View
      accessibilityLabel={name ?? undefined}
      style={{ width: size, height: size, borderRadius }}
      className="bg-primary items-center justify-center"
    >
      <Text style={{ fontSize }} className="text-foreground font-semibold">
        {initials}
      </Text>
    </View>
  );
}
