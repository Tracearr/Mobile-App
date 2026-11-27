/**
 * One server's live load in a compact card: CPU with a two-minute sparkline, RAM, and network
 * where any selected server reports bandwidth. Sits under Now Playing on the dashboard.
 */
import { View } from 'react-native';
import { Canvas, Path } from '@shopify/react-native-skia';
import { Play } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { formatPercent, useTranslation } from '@tracearr/translations/mobile';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { ServerTag } from '@/components/server/ServerTag';
import type { ServerLiveStatsResult } from '@/hooks/useServerLiveStats';
import { formatBitsPerSecond, sparklinePath } from '@/lib/liveStatsWindow';
import { ACCENT_COLOR, colors } from '@/lib/theme';

const SPARK_WIDTH = 44;
const SPARK_HEIGHT = 16;
const EMPTY = '-';

// An idle media server process sits under 1%, which a whole-number label shows as 0%.
export function formatUtilization(value: number): string {
  if (value > 0 && value < 0.1) return `<${formatPercent(0.1, 1, true)}`;
  return formatPercent(value, value < 10 ? 1 : 0, true);
}

// Silo reports no process CPU; its host figure stands in.
export function cpuValue(latest: { processCpu: number | null; hostCpu: number | null }) {
  return latest.processCpu ?? latest.hostCpu;
}

function Sparkline({
  stats,
  color,
}: {
  stats: Pick<ServerLiveStatsResult, 'statistics' | 'serverNow' | 'gapSeconds'>;
  color: string;
}) {
  const points = stats.statistics.flatMap((p) => {
    const value = p.processCpuUtilization ?? p.hostCpuUtilization;
    return value === null ? [] : [{ at: p.at, value }];
  });
  // Drawn 1 pt in from top and bottom so the stroke at 0% and 100% is not half clipped
  const path = sparklinePath(
    points,
    stats.serverNow,
    SPARK_WIDTH,
    SPARK_HEIGHT - 2,
    stats.gapSeconds
  );
  if (!path) return null;
  return (
    <Canvas
      style={{ width: SPARK_WIDTH, height: SPARK_HEIGHT }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Path
        path={path}
        color={color}
        style="stroke"
        strokeWidth={1.5}
        strokeJoin="round"
        transform={[{ translateY: 1 }]}
      />
    </Canvas>
  );
}

function Metric({
  label,
  value,
  sub,
  children,
}: {
  label: string;
  value: string;
  sub?: string[];
  children?: ReactNode;
}) {
  return (
    <View style={{ flex: 1, minWidth: 0 }}>
      <Text className="text-muted-foreground text-[11px]" numberOfLines={1}>
        {label}
      </Text>
      {/* Clips the sparkline rather than letting it run into the next cell on narrow phones */}
      <View className="flex-row items-center gap-1.5" style={{ overflow: 'hidden' }}>
        <Text
          className="text-[15px] font-semibold"
          style={{ fontVariant: ['tabular-nums'] }}
          numberOfLines={1}
        >
          {value}
        </Text>
        {children}
      </View>
      {sub?.map((line) => (
        <Text key={line} className="text-muted-foreground text-[10px]" numberOfLines={1}>
          {line}
        </Text>
      ))}
    </View>
  );
}

interface ServerLoadCardProps {
  stats: ServerLiveStatsResult;
  // Some selected server reports bandwidth, so every card keeps the column for alignment
  showNetwork: boolean;
  // Host load belongs to the box, so co-hosted servers would all repeat it. Multi-server
  // views pass false, as web drops the host series there.
  showSystem: boolean;
  // Set in multi-server views, where each card names its server and its stream count
  serverName?: string;
  serverColor?: string | null;
  streamCount?: number;
}

export function ServerLoadCard({
  stats,
  showNetwork,
  showSystem,
  serverName,
  serverColor,
  streamCount,
}: ServerLoadCardProps) {
  const { t } = useTranslation(['mobile', 'common', 'pages']);
  const { latest } = stats;
  const system = t('mobile:resources.system', { defaultValue: 'System' });

  let body;
  let summary: string;
  if (stats.isLoading) {
    summary = t('common:states.loading');
    body = <Text className="text-muted-foreground text-xs">{summary}</Text>;
  } else if (stats.error) {
    summary = t('common:errors.failedToLoad', {
      item: t('mobile:resources.item', { defaultValue: 'resource data' }),
    });
    body = <Text className="text-destructive text-xs">{summary}</Text>;
  } else if (!latest) {
    summary = t('mobile:resources.noData', { defaultValue: 'No resource data' });
    body = <Text className="text-muted-foreground text-xs">{summary}</Text>;
  } else {
    const cpu = cpuValue(latest);
    const hostOnlyCpu = latest.processCpu === null;
    const cpuSub = hostOnlyCpu
      ? [system]
      : showSystem && latest.hostCpu !== null
        ? [`${system} ${formatUtilization(latest.hostCpu)}`]
        : undefined;
    const ramSub =
      showSystem && latest.hostMemory !== null
        ? [`${system} ${formatUtilization(latest.hostMemory)}`]
        : undefined;
    const { bandwidth } = stats;
    const network = bandwidth ? formatBitsPerSecond(bandwidth.local + bandwidth.remote) : EMPTY;
    const networkSub =
      bandwidth && showSystem
        ? [
            `${formatBitsPerSecond(bandwidth.local)} ${t('common:labels.local')}`,
            `${formatBitsPerSecond(bandwidth.remote)} ${t('pages:history.filters.remote')}`,
          ]
        : undefined;

    const cpuText = cpu === null ? EMPTY : formatUtilization(cpu);
    const ramText = formatUtilization(latest.processMemory);
    summary = [
      `${t('mobile:resources.cpu')} ${cpuText}`,
      `${t('mobile:resources.ram')} ${ramText}`,
      showNetwork ? `${t('pages:dashboard.bandwidth')} ${network}` : null,
    ]
      .filter(Boolean)
      .join(', ');

    body = (
      <View className="flex-row gap-3">
        <Metric label={t('mobile:resources.cpu')} value={cpuText} sub={cpuSub}>
          <Sparkline stats={stats} color={serverColor ?? ACCENT_COLOR} />
        </Metric>
        <Metric label={t('mobile:resources.ram')} value={ramText} sub={ramSub} />
        {showNetwork && (
          <Metric label={t('pages:dashboard.bandwidth')} value={network} sub={networkSub} />
        )}
      </View>
    );
  }

  const streams = streamCount ? t('common:count.stream', { count: streamCount }) : null;
  return (
    <Card
      padding="compact"
      accessible
      accessibilityLabel={
        serverName ? [`${serverName}: ${summary}`, streams].filter(Boolean).join(', ') : summary
      }
    >
      {serverName ? (
        <View className="mb-2 flex-row items-center justify-between gap-2">
          <ServerTag name={serverName} color={serverColor} size="md" />
          {streamCount ? (
            <View className="flex-row items-center gap-1">
              <Play size={10} color={colors.text.muted.dark} fill={colors.text.muted.dark} />
              <Text className="text-muted-foreground text-[11px]">{streamCount}</Text>
            </View>
          ) : null}
        </View>
      ) : null}
      {body}
    </Card>
  );
}
