import { useTranslation } from '@tracearr/translations/mobile';
import type { Translate } from '@/lib/automations';

// src/lib/automations builds its keys at runtime. The typed `t` takes a plain string key
// only beside a defaultValue, and the key is what i18next returns for a miss anyway.
export function useTranslate(): Translate {
  const { t } = useTranslation(['pages']);
  return (key, options) => t(key, { ...options, defaultValue: key });
}
