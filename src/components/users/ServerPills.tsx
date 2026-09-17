import { View } from 'react-native';
import { useTranslation } from '@tracearr/translations/mobile';
import { ServerTag } from '@/components/server/ServerTag';
import { Text } from '@/components/ui/text';
import { useMediaServer } from '@/providers/MediaServerProvider';
import { cn } from '@/lib/utils';

interface ServerPillsProps {
  servers: { id: string; name: string }[];
  /** Servers past this count collapse into a "+N" marker. */
  max?: number;
  size?: 'sm' | 'md';
  className?: string;
}

export function ServerPills({ servers, max = 3, size = 'sm', className }: ServerPillsProps) {
  const { t } = useTranslation(['pages']);
  const { servers: mediaServers } = useMediaServer();
  if (servers.length === 0) return null;

  const hidden = servers.slice(max);

  return (
    <View className={cn('flex-row flex-wrap items-center gap-x-2.5 gap-y-1', className)}>
      {servers.slice(0, max).map((server) => (
        <ServerTag
          key={server.id}
          size={size}
          name={server.name}
          color={mediaServers.find((s) => s.id === server.id)?.color}
        />
      ))}
      {hidden.length > 0 && (
        <Text
          accessibilityLabel={hidden.map((server) => server.name).join(', ')}
          className="text-muted-foreground text-[10px]"
        >
          {t('pages:users.mergeMoreServers', { count: hidden.length })}
        </Text>
      )}
    </View>
  );
}
