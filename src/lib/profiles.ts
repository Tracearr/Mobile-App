import type { ProfileFilterOption, Session } from '@tracearr/shared';

/** Formats a profile the server no longer lists ("{{name}} (removed)") */
export type RemovedLabel = (name: string) => string;

type ProfileListing = Pick<ProfileFilterOption, 'name' | 'removed' | 'main' | 'accountUsername'>;

export function profileLabel(
  profile: { name: string; removed: boolean },
  removed: RemovedLabel
): string {
  return profile.removed ? removed(profile.name) : profile.name;
}

/** A main profile lists as its account, any other by its own name. */
export function profileOptionLabel(option: ProfileListing, removed: RemovedLabel): string {
  return option.main ? option.accountUsername : profileLabel(option, removed);
}

/** A main profile shows as its account, so profiles are worth showing only once another is there. */
export function showsProfiles(profiles: Pick<ProfileFilterOption, 'main'>[]): boolean {
  return profiles.some((profile) => !profile.main);
}

/** The account's own profiles, or the whole identity's; none unless one of them is not main. */
export function profilesInView(
  all: ProfileFilterOption[] | undefined,
  scope: 'account' | 'identity',
  accountId: string
): ProfileFilterOption[] {
  if (!all) return [];
  const inView =
    scope === 'identity' ? all : all.filter((profile) => profile.serverUserId === accountId);
  return showsProfiles(inView) ? inView : [];
}

export function sessionProfileLabel(
  session: Pick<Session, 'profileId'>,
  labels: ReadonlyMap<string, string>
): string | null {
  return session.profileId === null ? null : (labels.get(session.profileId) ?? null);
}

const round2 = (value: number) => Math.round(value * 100) / 100;
const MIN_LETTER_SIZE = 7;

/**
 * Web's AvatarWithProfile proportions. Beside two-letter initials the badge is smaller so it
 * clears the letters. A letter under 7 px is unreadable, so the badge drops it.
 */
export function profileBadgeMetrics(
  avatarSize: number,
  initials: 'one' | 'two'
): { size: number; offset: number; ring: number; letterSize: number | null } {
  const [width, offset] = initials === 'one' ? [0.56, 0.2] : [0.44, 0.15];
  const size = avatarSize * width;
  const letterSize = size * 0.7;
  return {
    size: round2(size),
    offset: round2(-avatarSize * offset),
    ring: avatarSize >= 32 ? 2 : 1.5,
    letterSize: letterSize < MIN_LETTER_SIZE ? null : round2(letterSize),
  };
}
