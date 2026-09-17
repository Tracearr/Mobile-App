import type { NowPlayingWidgetProps } from './nowPlayingWidget';

// Metro picks nowPlayingPublisher.ios.ts on iOS. expo-widgets 58.0.3 keeps
// Android behind enableAndroid, with no timeline and no tap-to-open, so every
// other platform gets this no-op and never loads the SwiftUI layout.
export const widgetsSupported: boolean = false;

export function publishNowPlaying(_props: NowPlayingWidgetProps): void {}
