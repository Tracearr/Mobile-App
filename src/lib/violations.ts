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

export function ruleTypeLabel(type: string | null | undefined): string {
  return type ? type.replace(/_/g, ' ') : 'Custom Rule';
}
