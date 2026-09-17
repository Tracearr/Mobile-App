/**
 * Media server health banner
 * Names the media servers Tracearr cannot reach. Sibling of OfflineBanner:
 * same slot, size and pulse, in the destructive color web's banner uses.
 */
import { useState } from 'react';
import { TriangleAlert } from 'lucide-react-native';
import { useShallow } from 'zustand/react/shallow';
import { useTranslation } from '@tracearr/translations/mobile';
import { Banner } from '@/components/ui/banner';
import { useServerHealth } from '@/hooks/useServerHealth';
import { useAuthStateStore } from '@/lib/authStateStore';

export function ServerHealthBanner() {
  const { t } = useTranslation(['settings', 'common']);
  const { connectionState, server, tokenStatus } = useAuthStateStore(
    useShallow((s) => ({
      connectionState: s.connectionState,
      server: s.server,
      tokenStatus: s.tokenStatus,
    }))
  );
  const { unhealthyServers } = useServerHealth();
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  // A server that recovers leaves the dismissed list, so its next outage shows again.
  const stillDown = dismissedIds.filter((id) => unhealthyServers.some((s) => s.serverId === id));
  if (stillDown.length !== dismissedIds.length) setDismissedIds(stillDown);

  // The banner shares OfflineBanner's slot, and health is stale while Tracearr is unreachable.
  const visible =
    server !== null &&
    tokenStatus !== 'revoked' &&
    connectionState === 'connected' &&
    unhealthyServers.some((s) => !dismissedIds.includes(s.serverId));

  if (!visible) return null;

  const serverNames = unhealthyServers.map((s) => s.serverName).join(', ');
  const message =
    unhealthyServers.length === 1
      ? t('settings:serverHealth.unreachable', { serverName: serverNames })
      : t('settings:serverHealth.multipleUnreachable', {
          count: unhealthyServers.length,
          serverNames,
        });

  return (
    <Banner
      tone="destructive"
      icon={TriangleAlert}
      message={message}
      numberOfLines={1}
      action={{
        label: t('common:actions.dismiss'),
        onPress: () => setDismissedIds(unhealthyServers.map((s) => s.serverId)),
      }}
    />
  );
}
