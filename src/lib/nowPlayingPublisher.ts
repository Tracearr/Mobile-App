import type { WidgetContext } from './nowPlayingText';
import type { NowPlayingWidgetProps } from './nowPlayingWidget';

// Metro picks the .ios and .android variants on those platforms; anything else
// gets this no-op and never loads a widget layout.
export const widgetsSupported: boolean = false;

export function publishNowPlaying(_props: NowPlayingWidgetProps): void {}

export function publishWidgetContext(_context: WidgetContext | null): void {}
