/**
 * User avatar component with image and fallback to initials
 */
import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { Text } from './text';
import { colors } from '@/lib/theme';

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
  const borderRadiusValue = size / 2;

  if (thumbUrl) {
    return (
      <Image
        source={{ uri: thumbUrl }}
        style={[
          styles.image,
          {
            width: size,
            height: size,
            borderRadius: borderRadiusValue,
          },
        ]}
      />
    );
  }

  return (
    <View
      style={[
        styles.fallback,
        {
          width: size,
          height: size,
          borderRadius: borderRadiusValue,
        },
      ]}
    >
      <Text style={[styles.initials, { fontSize }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: colors.surface.dark,
  },
  fallback: {
    backgroundColor: colors.cyan.dark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    fontWeight: '600',
    color: colors.text.primary.dark,
  },
});
