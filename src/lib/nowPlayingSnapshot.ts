import { AppState, Platform } from 'react-native';
import type { ServerScope } from '@tracearr/shared';
import { api } from './api';
import { isAuthStateUnread, useAuthStateStore } from './authStateStore';
import { i18nReady } from './i18n';
import { publishNowPlaying, widgetsSupported } from './nowPlayingPublisher';
import { widgetText } from './nowPlayingText';
import {
  buildNowPlayingProps,
  drawsSameWidget,
  signedOutProps,
  type NowPlayingWidgetProps,
  type WidgetSession,
} from './nowPlayingWidget';

// The widget always covers every server. The in-app server selection is a view
// filter; a home screen count that silently followed it would under-report.
export const WIDGET_SCOPE: ServerScope = { mode: 'all' };

// Background launches get about 30 seconds in total and the axios default is 30.
const REFRESH_TIMEOUT_MS = 10_000;

// Background reloads spend WidgetKit's daily budget, but a skipped one leaves the
// stale mark where the last publish put it, so only near repeats are held back.
const SKIP_UNCHANGED_WITHIN_MS = 5 * 60 * 1000;

let published: NowPlayingWidgetProps | null = null;

export function nowPlayingSnapshotAge(): number {
  return Date.now() - (published?.asOfMs ?? 0);
}

export function publishSessions(
  sessions: readonly WidgetSession[],
  unhealthyServers: readonly { serverName: string }[],
  asOf: number
): void {
  const props = buildNowPlayingProps(sessions, unhealthyServers, asOf, widgetText());
  if (
    Platform.OS === 'ios' &&
    AppState.currentState !== 'active' &&
    published !== null &&
    asOf - published.asOfMs < SKIP_UNCHANGED_WITHIN_MS &&
    drawsSameWidget(published, props)
  ) {
    return;
  }
  publishNowPlaying(props);
  published = props;
}

export function publishSignedOut(): void {
  publishNowPlaying(signedOutProps(Date.now(), widgetText()));
  published = null;
}

function authReady(): Promise<void> {
  if (!useAuthStateStore.getState().isInitializing) return Promise.resolve();
  return new Promise((resolve) => {
    const unsubscribe = useAuthStateStore.subscribe((state) => {
      if (state.isInitializing) return;
      unsubscribe();
      resolve();
    });
  });
}

function isSignedOut(): boolean {
  const { server, tokenStatus } = useAuthStateStore.getState();
  return server === null || tokenStatus === 'revoked';
}

/**
 * Fetches a fresh snapshot outside React, for the background task, the push
 * task and the moment the app leaves the foreground. A failed fetch publishes
 * nothing: the previous snapshot stays up and its own timeline marks it stale.
 */
export async function refreshNowPlayingWidget(): Promise<boolean> {
  if (!widgetsSupported) return false;
  await Promise.all([authReady(), i18nReady.catch(() => undefined)]);
  // A launch that could not read the store hydrated without a server, which looks
  // exactly like being signed out. Replacing a live card with the pairing prompt
  // on that guess is worse than leaving the last snapshot to go stale on its own.
  if (isAuthStateUnread()) return false;
  if (isSignedOut()) {
    publishSignedOut();
    return true;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REFRESH_TIMEOUT_MS);
  try {
    const [sessions, unhealthyServers] = await Promise.all([
      api.sessions.active(WIDGET_SCOPE, controller.signal),
      api.servers.health(controller.signal),
    ]);
    publishSessions(sessions, unhealthyServers, Date.now());
    return true;
  } catch {
    // A 401 that could not be refreshed flips the store to revoked on its way out.
    if (!isAuthStateUnread() && isSignedOut()) publishSignedOut();
    return false;
  } finally {
    clearTimeout(timer);
  }
}
