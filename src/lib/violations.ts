import { MapPin, Users, Zap, Monitor, Globe, Clock, type LucideIcon } from 'lucide-react-native';
// 2.2 renamed rules to automations and dropped the RuleType export, loosening
// ViolationWithDetails.rule.type to string. The closed union lives here now.
export type RuleType =
  | 'impossible_travel'
  | 'simultaneous_locations'
  | 'device_velocity'
  | 'concurrent_streams'
  | 'geo_restriction'
  | 'account_inactivity';

/** Rule type → Lucide icon component mapping for mobile */
export const ruleIcons: Record<RuleType, LucideIcon> = {
  impossible_travel: MapPin,
  simultaneous_locations: Users,
  device_velocity: Zap,
  concurrent_streams: Monitor,
  geo_restriction: Globe,
  account_inactivity: Clock,
};
