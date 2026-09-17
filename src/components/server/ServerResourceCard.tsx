/**
 * Server resource monitoring card (CPU + RAM)
 * Displays real-time server resource utilization with progress bars
 * Note: Section header is rendered by parent - this is just the card content
 */
import { View, Animated } from 'react-native';
import { CircleAlert, Cpu, MemoryStick, Server, type LucideIcon } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import type { ServerType } from '@tracearr/shared';
import { formatPercent, useTranslation } from '@tracearr/translations/mobile';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Text } from '@/components/ui/text';
import { ServerTag } from '@/components/server/ServerTag';
import { useResponsive } from '@/hooks/useResponsive';
import type { ServerLiveStatsLatest } from '@/hooks/useServerLiveStats';
import { colors } from '@/lib/theme';

// Web's series colors (apps/web ServerResourceCharts.tsx)
const BAR_COLORS = {
  process: '#00b4e4',
  system: '#cc7b9f',
};

const PROCESS_LABELS: Record<ServerType, string> = {
  plex: 'Plex Media Server',
  jellyfin: 'Jellyfin',
  emby: 'Emby',
};

// An idle media server process sits under 1%, which a whole-number label shows as 0%.
function formatUtilization(value: number): string {
  if (value > 0 && value < 0.1) return `<${formatPercent(0.1, 1, true)}`;
  return formatPercent(value, value < 10 ? 1 : 0, true);
}

interface BarProps {
  label: string;
  value: number;
  color: string;
  isTablet: boolean;
}

function Bar({ label, value, color, isTablet }: BarProps) {
  const [width] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(width, { toValue: value, duration: 300, useNativeDriver: false }).start();
  }, [value, width]);

  const fontSize = isTablet ? 12 : 11;

  return (
    <View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 4,
        }}
      >
        <Text style={{ fontSize, color: colors.text.muted.dark }}>{label}</Text>
        <Text style={{ fontSize, fontWeight: '600', color: colors.text.primary.dark }}>
          {formatUtilization(value)}
        </Text>
      </View>
      <View
        style={{
          height: isTablet ? 8 : 6,
          backgroundColor: colors.surface.dark,
          borderRadius: 4,
          overflow: 'hidden',
        }}
      >
        <Animated.View
          style={{
            height: '100%',
            borderRadius: 4,
            backgroundColor: color,
            width: width.interpolate({
              inputRange: [0, 100],
              outputRange: ['0%', '100%'],
              extrapolate: 'clamp',
            }),
          }}
        />
      </View>
    </View>
  );
}

interface ResourceBarProps {
  label: string;
  processLabel: string;
  processValue: number;
  // Null when hidden, or when the source cannot see the host (non-Linux plugin hosts)
  systemValue: number | null;
  icon: LucideIcon;
  isTablet: boolean;
}

function ResourceBar({
  label,
  processLabel,
  processValue,
  systemValue,
  icon: Icon,
  isTablet,
}: ResourceBarProps) {
  const { t } = useTranslation(['mobile']);
  const gap = isTablet ? 8 : 6;

  return (
    <View style={{ gap }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Icon size={isTablet ? 18 : 16} color={colors.text.primary.dark} />
        <Text
          style={{
            marginLeft: 6,
            fontSize: isTablet ? 14 : 13,
            fontWeight: '600',
            color: colors.text.primary.dark,
          }}
        >
          {label}
        </Text>
      </View>

      <Bar
        label={processLabel}
        value={processValue}
        color={BAR_COLORS.process}
        isTablet={isTablet}
      />
      {systemValue !== null && (
        <Bar
          label={t('mobile:resources.system', { defaultValue: 'System' })}
          value={systemValue}
          color={BAR_COLORS.system}
          isTablet={isTablet}
        />
      )}
    </View>
  );
}

interface ServerResourceCardProps {
  serverType: ServerType;
  // Null while the source has no sample newer than the gap threshold
  latest: ServerLiveStatsLatest | null;
  isLoading?: boolean;
  error?: Error | null;
  // Set in multi-server views, where each card names its server
  serverName?: string;
  serverColor?: string | null;
  // Host load belongs to the box, so co-hosted servers would all repeat it.
  // Multi-server views pass false, as web drops the host series there.
  showSystem?: boolean;
}

export function ServerResourceCard({
  serverType,
  latest,
  isLoading,
  error,
  serverName,
  serverColor,
  showSystem = true,
}: ServerResourceCardProps) {
  const { t } = useTranslation(['mobile', 'common']);
  const { isTablet } = useResponsive();

  let body;
  if (isLoading) {
    body = (
      <View style={{ height: 80, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 12, color: colors.text.muted.dark }}>
          {t('common:states.loading')}
        </Text>
      </View>
    );
  } else if (error) {
    body = (
      <EmptyState
        compact
        tone="danger"
        icon={CircleAlert}
        title={t('common:errors.failedToLoad', {
          item: t('mobile:resources.item', { defaultValue: 'resource data' }),
        })}
        description={error.message}
      />
    );
  } else if (!latest) {
    body = (
      <EmptyState
        compact
        icon={Server}
        title={t('mobile:resources.noData', { defaultValue: 'No resource data' })}
        description={t('mobile:resources.waiting', {
          defaultValue: 'Waiting for server statistics...',
        })}
      />
    );
  } else {
    const processLabel = PROCESS_LABELS[serverType];
    body = (
      <View style={{ gap: isTablet ? 16 : 12 }}>
        <ResourceBar
          label={t('mobile:resources.cpu')}
          icon={Cpu}
          processLabel={processLabel}
          processValue={latest.processCpu}
          systemValue={showSystem ? latest.hostCpu : null}
          isTablet={isTablet}
        />
        <ResourceBar
          label={t('mobile:resources.ram')}
          icon={MemoryStick}
          processLabel={processLabel}
          processValue={latest.processMemory}
          systemValue={showSystem ? latest.hostMemory : null}
          isTablet={isTablet}
        />
      </View>
    );
  }

  return (
    <Card padding={isTablet ? 'default' : 'compact'}>
      <ServerTag name={serverName} color={serverColor} size="md" className="mb-2.5" />
      {body}
    </Card>
  );
}
