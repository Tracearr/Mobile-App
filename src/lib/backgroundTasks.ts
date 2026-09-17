/**
 * Tasks the OS runs while the app is in the background or not running.
 * Both are defined at module scope because expo-task-manager loads the bundle
 * headless and only finds tasks that exist once the modules have evaluated.
 */
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import * as BackgroundTask from 'expo-background-task';
import { AppState } from 'react-native';
import type { EncryptedPushPayload } from '@tracearr/shared';
import { decryptPushPayload } from './crypto';
import { widgetsSupported } from './nowPlayingPublisher';
import { refreshNowPlayingWidget } from './nowPlayingSnapshot';

export const BACKGROUND_NOTIFICATION_TASK = 'BACKGROUND_NOTIFICATION_TASK';
export const WIDGET_REFRESH_TASK = 'WIDGET_REFRESH_TASK';

// The OS treats this as a floor. iOS usually runs the worker far less often.
const WIDGET_REFRESH_MINUTES = 15;

const WIDGET_PUSH_TYPES = new Set([
  'stream_started',
  'stream_stopped',
  'server_down',
  'server_up',
  'data_sync',
]);

export function isEncrypted(data: unknown): data is EncryptedPushPayload {
  return (
    typeof data === 'object' &&
    data !== null &&
    'v' in data &&
    data.v === 1 &&
    'iv' in data &&
    typeof data.iv === 'string' &&
    'ct' in data &&
    typeof data.ct === 'string' &&
    'tag' in data &&
    typeof data.tag === 'string'
  );
}

// Both platforms deliver the Expo `data` object as a JSON string in data.dataString.
async function pushTypeOf(payload: Notifications.NotificationTaskPayload): Promise<unknown> {
  if ('actionIdentifier' in payload) return undefined;
  const raw = payload.data?.dataString;
  if (typeof raw !== 'string') return undefined;
  const data: unknown = JSON.parse(raw);
  const decoded = isEncrypted(data) ? await decryptPushPayload(data) : data;
  return typeof decoded === 'object' && decoded !== null && 'type' in decoded
    ? decoded.type
    : undefined;
}

TaskManager.defineTask<Notifications.NotificationTaskPayload>(
  BACKGROUND_NOTIFICATION_TASK,
  async ({ data, error }) => {
    // The widget is the only consumer of a background push.
    if (!widgetsSupported || error || !data) {
      return Notifications.BackgroundNotificationTaskResult.NoData;
    }
    try {
      const type = await pushTypeOf(data);
      // In the foreground the active-sessions query already feeds the widget.
      if (
        typeof type === 'string' &&
        WIDGET_PUSH_TYPES.has(type) &&
        AppState.currentState !== 'active' &&
        (await refreshNowPlayingWidget())
      ) {
        return Notifications.BackgroundNotificationTaskResult.NewData;
      }
    } catch (err) {
      console.error('[BackgroundTask] Push handling failed:', err);
      return Notifications.BackgroundNotificationTaskResult.Failed;
    }
    return Notifications.BackgroundNotificationTaskResult.NoData;
  }
);

TaskManager.defineTask(WIDGET_REFRESH_TASK, async () =>
  (await refreshNowPlayingWidget())
    ? BackgroundTask.BackgroundTaskResult.Success
    : BackgroundTask.BackgroundTaskResult.Failed
);

export async function registerBackgroundNotificationTask(): Promise<void> {
  try {
    if (!(await TaskManager.isTaskRegisteredAsync(BACKGROUND_NOTIFICATION_TASK))) {
      await Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK);
    }
  } catch (error) {
    console.error('[BackgroundTask] Failed to register task:', error);
  }
}

export async function unregisterBackgroundNotificationTask(): Promise<void> {
  try {
    if (await TaskManager.isTaskRegisteredAsync(BACKGROUND_NOTIFICATION_TASK)) {
      await Notifications.unregisterTaskAsync(BACKGROUND_NOTIFICATION_TASK);
    }
  } catch (error) {
    console.error('[BackgroundTask] Failed to unregister task:', error);
  }
}

// registerTaskAsync is a no-op when already registered and on the iOS simulator.
export async function registerWidgetRefreshTask(): Promise<void> {
  try {
    await BackgroundTask.registerTaskAsync(WIDGET_REFRESH_TASK, {
      minimumInterval: WIDGET_REFRESH_MINUTES,
    });
  } catch (error) {
    console.error('[BackgroundTask] Failed to register widget refresh:', error);
  }
}

export async function unregisterWidgetRefreshTask(): Promise<void> {
  try {
    if (await TaskManager.isTaskRegisteredAsync(WIDGET_REFRESH_TASK)) {
      await BackgroundTask.unregisterTaskAsync(WIDGET_REFRESH_TASK);
    }
  } catch (error) {
    console.error('[BackgroundTask] Failed to unregister widget refresh:', error);
  }
}
