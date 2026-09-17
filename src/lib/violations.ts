import {
  MapPin,
  Users,
  Zap,
  Monitor,
  Globe,
  Clock,
  AlertTriangle,
  type LucideIcon,
} from 'lucide-react-native';
import { getViolationDescription } from '@tracearr/shared';
import type { UnitSystem, ViolationWithDetails } from '@tracearr/shared';

// Legacy rule types still arrive from 2.1 servers; 2.2 rows carry rule.type null and
// take the fallback, which is what the web does (pages/Violations.tsx:417-424).
const ruleIcons: Record<string, LucideIcon> = {
  impossible_travel: MapPin,
  simultaneous_locations: Users,
  device_velocity: Zap,
  concurrent_streams: Monitor,
  geo_restriction: Globe,
  account_inactivity: Clock,
};

export function ruleIcon(type: string | null | undefined): LucideIcon {
  return (type && ruleIcons[type]) || AlertTriangle;
}

// Evidence on a user_id condition carries the raw account id; the web swaps in the
// display name the same way (pages/ViolationDetail.tsx).
export function violationDescription(
  violation: ViolationWithDetails,
  unitSystem: UnitSystem
): string {
  const description = getViolationDescription(violation, unitSystem);
  const user = violation.user;
  return description.split(user.id).join(user.identityName ?? user.username);
}
