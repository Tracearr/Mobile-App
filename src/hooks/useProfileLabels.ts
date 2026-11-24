import type { ProfileFilterOption } from '@tracearr/shared';
import { useTranslation } from '@tracearr/translations/mobile';
import { profileLabel, profileOptionLabel } from '@/lib/profiles';

export function useProfileLabels() {
  const { t } = useTranslation(['common']);
  const removed = (name: string) => t('common:labels.profileRemoved', { name });
  return {
    profileLabel: (profile: { name: string; removed: boolean }) => profileLabel(profile, removed),
    profileOptionLabel: (
      option: Pick<ProfileFilterOption, 'name' | 'removed' | 'main' | 'accountUsername'>
    ) => profileOptionLabel(option, removed),
  };
}
