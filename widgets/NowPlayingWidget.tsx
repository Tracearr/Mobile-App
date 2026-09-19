import {
  AccessoryWidgetBackground,
  HStack,
  Image,
  ProgressView,
  Spacer,
  Text,
  VStack,
  ZStack,
} from '@expo/ui/swift-ui';
import {
  font,
  foregroundStyle,
  frame,
  lineLimit,
  minimumScaleFactor,
  monospacedDigit,
  opacity,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';
import {
  WIDGET_INITIAL_PROPS,
  type NowPlayingRow,
  type NowPlayingWidgetOptions,
  type NowPlayingWidgetProps,
} from '../src/lib/nowPlayingWidget';

// Everything the layout uses is declared inside it or arrives in props: only the
// function body ships to the widget extension.
const NowPlayingWidget = (
  props: NowPlayingWidgetProps,
  environment: WidgetEnvironment<NowPlayingWidgetOptions>
) => {
  'widget';
  const family = environment.widgetFamily;
  const renderedAt = environment.date ? environment.date.getTime() : props.asOfMs;
  const stale = props.asOfMs > 0 && renderedAt >= props.staleAtMs;
  const asOf =
    props.asOfMs > 0
      ? renderedAt >= props.datedAtMs
        ? props.asOfDatedLabel
        : props.asOfLabel
      : '';
  const signedOut = props.status === 'signedOut';
  const primary = foregroundStyle({ type: 'hierarchical', style: 'primary' });
  const secondary = foregroundStyle({ type: 'hierarchical', style: 'secondary' });
  const warning = foregroundStyle('#F59E0B');
  const link = widgetURL(props.url);

  if (family === 'accessoryInline') {
    const inline = signedOut
      ? props.heading
      : stale
        ? `${props.streamsLabel} ${asOf}`
        : [props.streamsLabel, props.transcodesLabel, props.serversDownCountLabel]
            .filter(Boolean)
            .join(' · ');
    return <Text modifiers={[link]}>{inline}</Text>;
  }

  if (family === 'accessoryCircular') {
    const dated = props.asOfMs > 0 && renderedAt >= props.datedAtMs;
    return (
      <ZStack modifiers={[link]}>
        <AccessoryWidgetBackground />
        <VStack spacing={0}>
          <Image systemName={signedOut ? 'link' : stale ? 'clock' : 'play.fill'} size={10} />
          <Text
            modifiers={[
              font({ size: 22, weight: 'semibold', design: 'rounded' }),
              monospacedDigit(),
              minimumScaleFactor(0.6),
              lineLimit(1),
            ]}
          >
            {signedOut || dated ? '-' : props.streamCount}
          </Text>
          <Text modifiers={[font({ size: 9 }), lineLimit(1), minimumScaleFactor(0.7)]}>
            {signedOut || dated ? '' : props.timeLabel}
          </Text>
        </VStack>
      </ZStack>
    );
  }

  const footer = (
    <Text modifiers={[font({ size: 11 }), stale ? warning : secondary, lineLimit(1)]}>{asOf}</Text>
  );

  const summary = (
    <VStack alignment="leading" spacing={2}>
      <Text modifiers={[font({ size: 12, weight: 'semibold' }), secondary, lineLimit(1)]}>
        {props.heading}
      </Text>
      {signedOut ? (
        <Text modifiers={[font({ size: 13 }), primary]}>{props.message}</Text>
      ) : (
        <VStack alignment="leading" spacing={0} modifiers={[opacity(stale ? 0.5 : 1)]}>
          <Text
            modifiers={[
              font({ size: 40, weight: 'bold', design: 'rounded' }),
              monospacedDigit(),
              primary,
              lineLimit(1),
              minimumScaleFactor(0.5),
            ]}
          >
            {props.streamCount}
          </Text>
          <Text modifiers={[font({ size: 13, weight: 'medium' }), primary, lineLimit(1)]}>
            {props.streamsLabel}
          </Text>
          {props.transcodesLabel ? (
            <Text modifiers={[font({ size: 12 }), secondary, lineLimit(1)]}>
              {props.transcodesLabel}
            </Text>
          ) : null}
        </VStack>
      )}
      <Spacer />
      {props.serversDownLabel ? (
        <Text modifiers={[font({ size: 11, weight: 'medium' }), warning, lineLimit(2)]}>
          {props.serversDownLabel}
        </Text>
      ) : null}
      {signedOut ? null : footer}
    </VStack>
  );

  const large = family === 'systemLarge';
  if ((family !== 'systemMedium' && !large) || signedOut) {
    return (
      <HStack modifiers={[link, frame({ maxWidth: Infinity, maxHeight: Infinity })]}>
        {summary}
        <Spacer />
      </HStack>
    );
  }

  const options = environment.configuration;
  const join = (parts: string[]) => parts.filter(Boolean).join(' · ');
  const detailLines = (row: NowPlayingRow) => {
    const who = [options.showUser ? row.user : '', row.status];
    const how = [options.showQuality ? row.quality : '', options.showPlayer ? row.player : ''];
    if (!large) return [join([options.showEpisode ? row.episode : '', ...who, ...how])];
    const what = options.showEpisode ? [row.episode, row.episodeTitle] : [];
    return [join(what), join(who), join(how)].filter(Boolean);
  };
  const progress = (row: NowPlayingRow) => {
    if (!options.showProgress || row.durationMs <= 0) return null;
    if (row.paused || stale) {
      return <ProgressView value={Math.min(row.progressMs / row.durationMs, 1)} />;
    }
    const startedAt = props.asOfMs - row.progressMs;
    return (
      <ProgressView
        timerInterval={{ lower: new Date(startedAt), upper: new Date(startedAt + row.durationMs) }}
        countsDown={false}
      />
    );
  };
  // Each extra line a row grows costs the large size one row.
  const extraLines =
    Number(options.showEpisode) +
    Number(options.showQuality || options.showPlayer) +
    Number(options.showProgress);
  const rowLimit = large ? props.rowLimits.systemLarge - extraLines : props.rowLimits.systemMedium;

  const rows = (
    <VStack
      alignment="leading"
      spacing={large ? 8 : 6}
      modifiers={[frame({ maxWidth: Infinity, alignment: 'leading' }), opacity(stale ? 0.5 : 1)]}
    >
      {props.rows.length === 0 ? (
        <Text modifiers={[font({ size: 13 }), secondary]}>{props.emptyLabel}</Text>
      ) : (
        props.rows.slice(0, rowLimit).map((row) => (
          <HStack key={row.id} alignment="top" spacing={6}>
            <Image systemName={row.paused ? 'pause.fill' : 'play.fill'} size={10} />
            <VStack alignment="leading" spacing={large ? 1 : 0}>
              <Text modifiers={[font({ size: 13, weight: 'semibold' }), primary, lineLimit(1)]}>
                {row.title}
              </Text>
              {detailLines(row).map((line, index) => (
                <Text key={index} modifiers={[font({ size: 11 }), secondary, lineLimit(1)]}>
                  {line}
                </Text>
              ))}
              {progress(row)}
            </VStack>
          </HStack>
        ))
      )}
      <Spacer />
    </VStack>
  );

  if (large) {
    return (
      <VStack
        alignment="leading"
        spacing={8}
        modifiers={[
          link,
          frame({ maxWidth: Infinity, maxHeight: Infinity, alignment: 'topLeading' }),
        ]}
      >
        <VStack alignment="leading" spacing={0}>
          <Text modifiers={[font({ size: 12, weight: 'semibold' }), secondary, lineLimit(1)]}>
            {props.heading}
          </Text>
          <HStack alignment="lastTextBaseline" spacing={8} modifiers={[opacity(stale ? 0.5 : 1)]}>
            <Text
              modifiers={[
                font({ size: 34, weight: 'bold', design: 'rounded' }),
                monospacedDigit(),
                primary,
                lineLimit(1),
              ]}
            >
              {props.streamCount}
            </Text>
            <Text modifiers={[font({ size: 13, weight: 'medium' }), primary, lineLimit(1)]}>
              {join([props.streamsLabel, props.transcodesLabel])}
            </Text>
          </HStack>
        </VStack>
        {rows}
        {props.serversDownLabel ? (
          <Text modifiers={[font({ size: 11, weight: 'medium' }), warning, lineLimit(2)]}>
            {props.serversDownLabel}
          </Text>
        ) : null}
        {footer}
      </VStack>
    );
  }

  return (
    <HStack
      alignment="top"
      spacing={12}
      modifiers={[link, frame({ maxWidth: Infinity, maxHeight: Infinity })]}
    >
      {summary}
      {rows}
    </HStack>
  );
};

export default createWidget('NowPlaying', NowPlayingWidget, WIDGET_INITIAL_PROPS);
