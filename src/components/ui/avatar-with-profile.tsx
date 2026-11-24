import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import type { NonMainProfile } from '@tracearr/shared';
import { Text } from './text';
import { buildAvatarUrl } from './user-avatar';
import { useProfileLabels } from '@/hooks/useProfileLabels';
import { profileBadgeMetrics } from '@/lib/profiles';
import { colors } from '@/lib/theme';

interface AvatarWithProfileProps {
  serverId: string;
  profile: NonMainProfile | undefined;
  /** The wrapped avatar's size, which the badge scales from */
  avatarSize: number;
  /** Two-letter initials reach the corner, so the badge beside them is smaller */
  initials?: 'one' | 'two';
  /** The account's avatar */
  children: ReactNode;
}

/** The account's avatar, with the profile that played over its bottom-right when it is not the main one */
export function AvatarWithProfile({
  serverId,
  profile,
  avatarSize,
  initials = 'one',
  children,
}: AvatarWithProfileProps) {
  const { profileLabel } = useProfileLabels();
  if (!profile) return children;

  const { size, offset, ring, letterSize } = profileBadgeMetrics(avatarSize, initials);
  const imageUrl = profile.thumbUrl ? buildAvatarUrl(profile.thumbUrl, serverId, 24) : null;
  const outer = size + ring * 2;

  return (
    <View style={{ position: 'relative' }}>
      {children}
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={profileLabel(profile)}
        className="bg-primary items-center justify-center overflow-hidden"
        style={{
          position: 'absolute',
          right: offset - ring,
          bottom: offset - ring,
          width: outer,
          height: outer,
          borderRadius: outer / 2,
          borderWidth: ring,
          borderColor: colors.card.dark,
          opacity: profile.removed ? 0.5 : 1,
          filter: profile.removed ? [{ grayscale: 1 }] : undefined,
        }}
      >
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={{ width: size, height: size }} />
        ) : letterSize !== null ? (
          <Text
            className="text-foreground font-semibold"
            style={{ fontSize: letterSize, lineHeight: size }}
          >
            {profile.name[0]?.toUpperCase() ?? '?'}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
