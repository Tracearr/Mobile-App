import { MapPin, Users, Zap, Monitor, Globe, Clock, type LucideIcon } from 'lucide-react-native';
import type { RuleType } from '@tracearr/shared';

/** Rule type → Lucide icon component mapping for mobile */
export const ruleIcons: Record<RuleType, LucideIcon> = {
  impossible_travel: MapPin,
  simultaneous_locations: Users,
  device_velocity: Zap,
  concurrent_streams: Monitor,
  geo_restriction: Globe,
  account_inactivity: Clock,
};
