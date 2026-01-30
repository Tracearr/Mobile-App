/**
 * User avatar component with image and fallback to initials
 */
import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
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
  const borderRadiusValue = size / 2;

  // Need to keep StyleSheet for dynamic size/borderRadius values
  const dynamicStyles = StyleSheet.create({
    image: {
      width: size,
      height: size,
      borderRadius: borderRadiusValue,
    },
    fallback: {
      width: size,
      height: size,
      borderRadius: borderRadiusValue,
    },
    initials: {
      fontSize,
    },
  });

  if (thumbUrl) {
    return <Image source={{ uri: thumbUrl }} style={dynamicStyles.image} className="bg-surface" />;
  }

  return (
    <View style={dynamicStyles.fallback} className="bg-primary items-center justify-center">
      <Text style={dynamicStyles.initials} className="text-foreground font-semibold">
        {initials}
      </Text>
    </View>
  );
}
