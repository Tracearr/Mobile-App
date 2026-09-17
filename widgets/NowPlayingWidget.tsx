import {
  AccessoryWidgetBackground,
  HStack,
  Image,
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
import type { NowPlayingWidgetProps } from '../src/lib/nowPlayingWidget';

// Everything the layout uses is declared inside it or arrives in props: only the
// function body ships to the widget extension. It renders before the app has
// ever run, so the initial props below are static English.
const NowPlayingWidget = (props: NowPlayingWidgetProps, environment: WidgetEnvironment) => {
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

  if (family !== 'systemMedium' || signedOut) {
    return (
      <HStack modifiers={[link, frame({ maxWidth: Infinity, maxHeight: Infinity })]}>
        {summary}
        <Spacer />
      </HStack>
    );
  }

  return (
    <HStack
      alignment="top"
      spacing={12}
      modifiers={[link, frame({ maxWidth: Infinity, maxHeight: Infinity })]}
    >
      {summary}
      <VStack
        alignment="leading"
        spacing={6}
        modifiers={[frame({ maxWidth: Infinity, alignment: 'leading' }), opacity(stale ? 0.5 : 1)]}
      >
        {props.rows.length === 0 ? (
          <Text modifiers={[font({ size: 13 }), secondary]}>{props.emptyLabel}</Text>
        ) : (
          props.rows.map((row) => (
            <HStack key={row.id} alignment="top" spacing={6}>
              <Image systemName={row.paused ? 'pause.fill' : 'play.fill'} size={10} />
              <VStack alignment="leading" spacing={0}>
                <Text modifiers={[font({ size: 13, weight: 'semibold' }), primary, lineLimit(1)]}>
                  {row.title}
                </Text>
                <Text modifiers={[font({ size: 11 }), secondary, lineLimit(1)]}>{row.detail}</Text>
              </VStack>
            </HStack>
          ))
        )}
        <Spacer />
      </VStack>
    </HStack>
  );
};

export default createWidget('NowPlaying', NowPlayingWidget, {
  status: 'signedOut',
  heading: 'Now Playing',
  message: 'Open Tracearr to load your streams.',
  streamCount: 0,
  transcodeCount: 0,
  streamsLabel: '',
  transcodesLabel: '',
  emptyLabel: '',
  rows: [],
  serversDownLabel: '',
  serversDownCountLabel: '',
  asOfMs: 0,
  timeLabel: '',
  asOfLabel: '',
  asOfDatedLabel: '',
  staleAtMs: 0,
  datedAtMs: 0,
  url: 'tracearr://',
});
