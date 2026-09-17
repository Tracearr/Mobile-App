import { Cpu, MonitorPlay, Zap } from 'lucide-react-native';
import { useTranslation } from '@tracearr/translations/mobile';
import { Badge, badgeTextVariants } from '@/components/ui/badge';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { colors } from '@/lib/theme';
import {
  PLAYBACK_DECISION_LABEL_KEYS,
  playbackDecision,
  type PlaybackDecisionInput,
} from '@/lib/playbackDecision';

interface QualityBadgeProps {
  session: PlaybackDecisionInput & {
    transcodeInfo?: { hwEncoding?: string | null; hwDecoding?: string | null } | null;
  };
  /** Icon in a 24pt badge with the label as its accessibility label, for dense cards. */
  iconOnly?: boolean;
  className?: string;
}

export function QualityBadge({ session, iconOnly = false, className }: QualityBadgeProps) {
  const { t } = useTranslation(['common']);
  const decision = playbackDecision(session);
  const isTranscode = decision === 'transcode';
  const isHwTranscode =
    isTranscode && !!(session.transcodeInfo?.hwEncoding || session.transcodeInfo?.hwDecoding);

  const variant = isTranscode ? 'warning' : 'success';
  const Icon = isTranscode ? (isHwTranscode ? Cpu : Zap) : MonitorPlay;
  const label = t(PLAYBACK_DECISION_LABEL_KEYS[decision]);

  return (
    <Badge
      accessible
      accessibilityLabel={label}
      variant={variant}
      className={cn(iconOnly ? 'h-6 w-6 justify-center px-0 py-0' : 'gap-1', className)}
    >
      <Icon size={iconOnly ? 14 : 12} color={isTranscode ? colors.warning : colors.success} />
      {!iconOnly && <Text className={badgeTextVariants({ variant })}>{label}</Text>}
    </Badge>
  );
}
