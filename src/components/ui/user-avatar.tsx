/**
 * User avatar component with image and fallback to initials
 */
import React from 'react';
import { View, Image } from 'react-native';
import { Text } from './text';
import { getServerUrl } from '@/lib/api';

interface UserAvatarProps {
  /** User's avatar URL (can be null) - either absolute URL or relative proxy path */
  thumbUrl?: string | null;
  /** Server ID for constructing proxy URLs (required for non-Plex avatars) */
  serverId?: string | null;
  /** Username for generating initials fallback */
  username: string;
  /** Size of the avatar (default: 40) */
  size?: number;
}

/**
 * Build avatar URL that goes through Tracearr's image proxy.
 * This ensures proper caching and avoids direct media server access.
 *
 * - Plex avatars from plex.tv are already absolute URLs - pass through
 * - Already-constructed proxy URLs (start with /api/) - just prepend server URL
 * - Raw media server paths - construct full proxy URL
 */
function buildAvatarUrl(
  thumbUrl: string,
  serverId: string | null | undefined,
  size: number
): string | null {
  const serverUrl = getServerUrl();

  // Already absolute URL (e.g., Plex avatars from plex.tv)
  if (thumbUrl.startsWith('http')) {
    return thumbUrl;
  }

  // Already a proxy URL (from API that pre-constructs it)
  if (thumbUrl.startsWith('/api/')) {
    return serverUrl ? `${serverUrl}${thumbUrl}` : null;
  }

  // Raw media server path - construct proxy URL (same as web's getAvatarUrl)
  if (!serverId || !serverUrl) {
    return null;
  }

  const params = new URLSearchParams({
    server: serverId,
    url: thumbUrl,
    width: String(size),
    height: String(size),
    fallback: 'avatar',
  });

  return `${serverUrl}/api/v1/images/proxy?${params}`;
}

export function UserAvatar({ thumbUrl, serverId, username, size = 40 }: UserAvatarProps) {
  const initials = username.slice(0, 2).toUpperCase();
  const fontSize = Math.max(size * 0.4, 10);
  const borderRadius = size / 2;

  if (thumbUrl) {
    const imageUrl = buildAvatarUrl(thumbUrl, serverId, size);
    if (imageUrl) {
      return (
        <Image
          source={{ uri: imageUrl }}
          style={{ width: size, height: size, borderRadius }}
          className="bg-surface"
        />
      );
    }
  }

  return (
    <View
      style={{ width: size, height: size, borderRadius }}
      className="bg-primary items-center justify-center"
    >
      <Text style={{ fontSize }} className="text-foreground font-semibold">
        {initials}
      </Text>
    </View>
  );
}
