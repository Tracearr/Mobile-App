// Where a tapped push lands. Keyed on the server's data.type set
// (apps/server/src/services/pushNotification.ts and notifications/destinations/push.ts).
// Media and update pushes carry no run or automation id, so they land on the dashboard.
export type PushDestination =
  | { screen: 'alerts' }
  | { screen: 'violation'; id: string }
  | { screen: 'session'; id: string }
  | { screen: 'activity' }
  | { screen: 'user'; id: string }
  | { screen: 'dashboard' };

type PushData = Record<string, unknown> | null | undefined;

function str(data: PushData, key: string): string | undefined {
  const v = data?.[key];
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

export function pushDestination(data: PushData): PushDestination {
  switch (data?.type) {
    case 'violation_detected': {
      const id = str(data, 'violationId');
      return id ? { screen: 'violation', id } : { screen: 'alerts' };
    }
    case 'stream_started':
    case 'stream_stopped': {
      const id = str(data, 'sessionId');
      return id ? { screen: 'session', id } : { screen: 'activity' };
    }
    case 'new_device':
    case 'trust_score_changed': {
      const id = str(data, 'serverUserId');
      return id ? { screen: 'user', id } : { screen: 'dashboard' };
    }
    default:
      return { screen: 'dashboard' };
  }
}
