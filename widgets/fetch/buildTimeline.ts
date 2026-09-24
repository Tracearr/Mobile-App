import i18n from 'i18next';
import {
  buildNowPlayingProps,
  nowPlayingTimeline,
  type NowPlayingWidgetProps,
  type WidgetSession,
} from '../../src/lib/nowPlayingWidget.ts';
import { widgetText, type WidgetContext } from '../../src/lib/nowPlayingText.ts';

export type FetchInput = {
  sessions: WidgetSession[];
  unhealthyServers: { serverName: string }[];
  context: WidgetContext;
  now: number;
};

export type FetchTimelineEntry = { timestamp: number; props: NowPlayingWidgetProps };

// Mirrors defaultI18nConfig in @tracearr/translations on the default instance,
// which widgetText and the package's formatters read. With inline resources
// init and changeLanguage complete before they return.
function prepare(context: WidgetContext): void {
  if (i18n.isInitialized) {
    for (const [lng, namespaces] of Object.entries(context.resources)) {
      for (const [ns, bundle] of Object.entries(namespaces)) {
        i18n.addResourceBundle(lng, ns, bundle, true, true);
      }
    }
    if (i18n.language !== context.lng) void i18n.changeLanguage(context.lng);
    return;
  }
  void i18n.init({
    lng: context.lng,
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common', 'pages', 'settings', 'mobile'],
    resources: context.resources,
    interpolation: { escapeValue: false },
    returnNull: false,
    returnEmptyString: false,
    initAsync: false,
  });
}

export function buildTimelineFromInput(input: FetchInput): FetchTimelineEntry[] {
  prepare(input.context);
  const props = buildNowPlayingProps(
    input.sessions,
    input.unhealthyServers,
    input.now,
    widgetText()
  );
  return nowPlayingTimeline(props).map(({ date, props: entry }) => ({
    timestamp: date.getTime(),
    props: entry,
  }));
}
