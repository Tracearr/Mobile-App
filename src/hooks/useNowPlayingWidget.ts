/**
 * Keeps the home screen widget in step with what the app already knows.
 * It watches the cache entries the dashboard and the health banner fill and
 * never fetches while the app is open, so it adds no requests and no renders.
 */
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { QueryObserver, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from '@tracearr/translations/mobile';
import type { ActiveSession } from '@tracearr/shared';
import type { UnhealthyServer } from '@/lib/api';
import { isAuthStateUnread, useAuthStateStore } from '@/lib/authStateStore';
import { registerWidgetRefreshTask, unregisterWidgetRefreshTask } from '@/lib/backgroundTasks';
import { queryKeys } from '@/lib/queryKeys';
import { widgetsSupported } from '@/lib/nowPlayingPublisher';
import { WIDGET_STALE_AFTER_MS } from '@/lib/nowPlayingWidget';
import {
  WIDGET_SCOPE,
  nowPlayingSnapshotAge,
  publishSessions,
  publishSignedOut,
  refreshNowPlayingWidget,
} from '@/lib/nowPlayingSnapshot';

// Matches the dashboard's refetch interval: older than this when the app is
// left means nothing in the foreground was feeding the all-servers entry.
const LEAVING_REFRESH_AFTER_MS = 30_000;

export function useNowPlayingWidget() {
  const queryClient = useQueryClient();
  const { i18n } = useTranslation();
  const language = i18n.language;
  const backendId = useAuthStateStore((s) => s.server?.id ?? null);
  // A launch that could not read the stored pairing hydrates without a server.
  // It is left alone like one still loading, not published as signed out.
  const auth = useAuthStateStore((s) =>
    s.isInitializing || isAuthStateUnread()
      ? 'loading'
      : s.server !== null && s.tokenStatus !== 'revoked'
        ? 'in'
        : 'out'
  );

  useEffect(() => {
    if (!widgetsSupported || auth === 'loading') return;
    if (auth === 'out') {
      publishSignedOut();
      void unregisterWidgetRefreshTask();
      return;
    }
    void registerWidgetRefreshTask();

    const sessions = new QueryObserver<ActiveSession[]>(queryClient, {
      queryKey: queryKeys.sessions.active(WIDGET_SCOPE),
      enabled: false,
    });
    const health = new QueryObserver<UnhealthyServer[]>(queryClient, {
      queryKey: queryKeys.servers.health(backendId),
      enabled: false,
    });

    let published = '';
    const publish = () => {
      const { data, dataUpdatedAt } = sessions.getCurrentResult();
      if (!data) return;
      const unhealthy = health.getCurrentResult();
      const version = `${dataUpdatedAt}:${unhealthy.dataUpdatedAt}`;
      if (version === published) return;
      published = version;
      publishSessions(data, unhealthy.data ?? [], dataUpdatedAt);
    };

    publish();
    const stopSessions = sessions.subscribe(publish);
    const stopHealth = health.subscribe(publish);
    const appState = AppState.addEventListener('change', (next) => {
      if (next === 'background' && nowPlayingSnapshotAge() > LEAVING_REFRESH_AFTER_MS) {
        void refreshNowPlayingWidget();
      }
      // The cache entries above only fill while the dashboard is mounted on the
      // all-servers scope, so coming back to any other screen would otherwise
      // leave the home screen showing whatever the last background run wrote.
      if (next === 'active' && nowPlayingSnapshotAge() > WIDGET_STALE_AFTER_MS) {
        void refreshNowPlayingWidget();
      }
    });

    return () => {
      stopSessions();
      stopHealth();
      appState.remove();
    };
  }, [queryClient, auth, backendId, language]);
}
