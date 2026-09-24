import NowPlaying from '../../widgets/NowPlayingWidget';
import type { WidgetContext } from './nowPlayingText';
import { nowPlayingTimeline, type NowPlayingWidgetProps } from './nowPlayingWidget';
import { clearWidgetContext, setWidgetContext } from './widgetBridge';

export const widgetsSupported: boolean = true;

export function publishNowPlaying(props: NowPlayingWidgetProps): void {
  try {
    NowPlaying.updateTimeline(nowPlayingTimeline(props));
  } catch (error) {
    // Thrown when the app group container is missing (a build signed without the
    // App Groups entitlement). Callers include a push task that must still finish.
    console.warn('[Widget] Could not publish the Now Playing snapshot:', error);
  }
}

export function publishWidgetContext(context: WidgetContext | null): void {
  if (context === null) {
    clearWidgetContext();
    return;
  }
  setWidgetContext(JSON.stringify(context));
}
