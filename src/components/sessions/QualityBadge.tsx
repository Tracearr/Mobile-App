import { View } from 'react-native';
import { AudioLines, Cpu, MonitorPlay, Package, Subtitles, Zap } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useTranslation } from '@tracearr/translations/mobile';
import { Badge, badgeTextVariants } from '@/components/ui/badge';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { colors } from '@/lib/theme';
import {
  PLAYBACK_DECISION_LABEL_KEYS,
  isSubtitleBurnIn,
  playbackDecision,
  type PlaybackDecision,
  type PlaybackDecisionInput,
  type SubtitleBurnInInput,
} from '@tracearr/shared';

const DECISION_ICONS: Record<PlaybackDecision, LucideIcon> = {
  directplay: MonitorPlay,
  copy: Package,
  audio_transcode: AudioLines,
  transcode: Zap,
};

interface QualityBadgeProps {
  session: PlaybackDecisionInput &
    SubtitleBurnInInput & {
      transcodeInfo?: { hwEncoding?: string | null; hwDecoding?: string | null } | null;
    };
  /** Bare 16pt icon in a 24pt box with the label as its accessibility label, for dense cards. */
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
  const color = isTranscode ? colors.warning : colors.success;
  const Icon = isHwTranscode ? Cpu : DECISION_ICONS[decision];
  const label = t(PLAYBACK_DECISION_LABEL_KEYS[decision], { ns: 'common' });

  if (iconOnly) {
    const isBurnIn = isSubtitleBurnIn(session);
    const compactLabel = isHwTranscode ? t('playback.hwTranscode', { ns: 'common' }) : label;
    return (
      <View
        accessible
        accessibilityLabel={
          isBurnIn ? `${compactLabel} · ${t('playback.burnIn', { ns: 'common' })}` : compactLabel
        }
        className={cn('h-6 w-6 items-center justify-center', className)}
      >
        <Icon size={16} color={color} />
        {isBurnIn && (
          <View className="bg-card absolute -right-1 -bottom-1 h-3.5 w-3.5 items-center justify-center rounded-full">
            <Subtitles size={10} color={colors.warning} />
          </View>
        )}
      </View>
    );
  }

  return (
    <Badge
      accessible
      accessibilityLabel={label}
      variant={variant}
      className={cn('gap-1', className)}
    >
      <Icon size={12} color={color} />
      <Text className={badgeTextVariants({ variant })}>{label}</Text>
    </Badge>
  );
}
