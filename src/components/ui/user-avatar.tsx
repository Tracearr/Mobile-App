/**
 * User avatar component with image and fallback to initials
 */
import React from 'react';
import { View, Image } from 'react-native';
import { Text } from './text';

interface UserAvatarProps {
  /** User's avatar URL (can be null) */
  thumbUrl?: string | null;
  /** Username for generating initials fallback */
  username: string;
  /** Size of the avatar (default: 40) */
  size?: number;
}

export function UserAvatar({ thumbUrl, username, size = 40 }: UserAvatarProps) {
  const initials = username.slice(0, 2).toUpperCase();
  const fontSize = Math.max(size * 0.4, 10);
  const borderRadius = size / 2;

  if (thumbUrl) {
    return (
      <Image
        source={{ uri: thumbUrl }}
        style={{ width: size, height: size, borderRadius }}
        className="bg-surface"
      />
    );
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
