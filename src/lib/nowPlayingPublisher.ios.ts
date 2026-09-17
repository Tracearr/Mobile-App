import NowPlaying from '../../widgets/NowPlayingWidget';
import { nowPlayingTimeline, type NowPlayingWidgetProps } from './nowPlayingWidget';

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
