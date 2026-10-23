import { requireOptionalNativeModule } from 'expo';
import { getCurrentLanguage } from '@tracearr/translations/mobile';

type RegionNamesModule = {
  regionName(code: string, language: string): string | null;
};

// Absent in builds made before the module existed; those keep showing the code.
const native = requireOptionalNativeModule<RegionNamesModule>('RegionNames');

/** A country code named in the interface language; anything else, such as "Local Network", is returned as is. */
export function countryName(country: string): string {
  return (
    (/^[A-Z]{2}$/.test(country) && native?.regionName(country, getCurrentLanguage())) || country
  );
}
