import NowPlaying from '../../widgets/NowPlayingWidget';
import type { NowPlayingWidgetProps } from './nowPlayingWidget';

export const widgetsSupported: boolean = true;

// Android has no timeline: the widget re-renders on each snapshot and reads the
// clock itself to decide whether the numbers have gone stale.
export function publishNowPlaying(props: NowPlayingWidgetProps): void {
  try {
    NowPlaying.updateSnapshot(props);
  } catch (error) {
    // Callers include a push task that must still finish.
    console.warn('[Widget] Could not publish the Now Playing snapshot:', error);
  }
}
