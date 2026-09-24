import {
  AccessoryWidgetBackground,
  HStack,
  Image,
  Link,
  ProgressView,
  Rectangle,
  Spacer,
  Text,
  VStack,
  ZStack,
} from '@expo/ui/swift-ui';
import {
  background,
  containerBackground,
  font,
  foregroundStyle,
  frame,
  labelsHidden,
  lineLimit,
  minimumScaleFactor,
  monospacedDigit,
  multilineTextAlignment,
  opacity,
  padding,
  shapes,
  tint,
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
// function body ships to the widget extension, so the palette repeats src/lib/theme.ts.
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
  const link = widgetURL(props.url);
  const join = (parts: string[]) => parts.filter(Boolean).join(' · ');
  const hierarchical = (style: 'primary' | 'secondary' | 'tertiary' | 'quaternary') =>
    foregroundStyle({ type: 'hierarchical', style });

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
          <Image systemName={signedOut ? 'link' : stale ? 'clock' : 'tv'} size={10} />
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

  // The lock screen shows counts only: no titles and no user names.
  if (family === 'accessoryRectangular') {
    const detail = signedOut
      ? props.message
      : stale
        ? asOf
        : join([props.transcodesLabel, props.serversDownCountLabel]);
    return (
      <VStack
        alignment="leading"
        spacing={0}
        modifiers={[link, frame({ maxWidth: Infinity, alignment: 'leading' })]}
      >
        <HStack alignment="firstTextBaseline" spacing={4}>
          <Image systemName="tv" modifiers={[font({ size: 12, weight: 'semibold' })]} />
          <Text modifiers={[font({ size: 13, weight: 'semibold' }), lineLimit(1)]}>
            {props.heading}
          </Text>
        </HStack>
        {signedOut ? null : (
          <Text
            modifiers={[font({ size: 15, weight: 'semibold' }), monospacedDigit(), lineLimit(1)]}
          >
            {props.streamsLabel}
          </Text>
        )}
        {detail ? (
          <Text modifiers={[font({ size: 12 }), hierarchical('secondary'), lineLimit(2)]}>
            {detail}
          </Text>
        ) : null}
      </VStack>
    );
  }

  // Tinted and clear home screens drop colour and backgrounds; StandBy drops the
  // container background. Both keep glyphs, so no state is told by colour alone.
  const dark = environment.colorScheme === 'dark';
  const accented = environment.widgetRenderingMode === 'accented';
  // expo-widgets sends showsContainerBackground but leaves it out of its type.
  const standBy =
    'showsContainerBackground' in environment && environment.showsContainerBackground === false;
  const fills = !accented && !standBy;
  const palette = {
    primary: dark ? '#FAFAFA' : '#09090B',
    secondary: dark ? '#A1A1AA' : '#71717A',
    tertiary: dark ? '#71717A' : '#A1A1AA',
    accent: dark ? '#18D1E7' : '#0891B2',
    transcode: dark ? '#F59E0B' : '#B45309',
    direct: dark ? '#22C55E' : '#15803D',
    tile: dark ? '#18181B' : '#F4F4F5',
    rule: dark ? '#27272A' : '#E4E4E7',
  };
  const tone = (
    hex: string,
    fallback: 'primary' | 'secondary' | 'tertiary' | 'quaternary' = 'primary'
  ) => (accented ? hierarchical(fallback) : foregroundStyle(hex));
  const primary = tone(palette.primary);
  const secondary = tone(palette.secondary, 'secondary');
  const tertiary = tone(palette.tertiary, 'tertiary');
  const accent = tone(palette.accent);
  const warning = tone(palette.transcode);
  const tileFill = (cornerRadius: number) =>
    fills ? [background(palette.tile, shapes.roundedRectangle({ cornerRadius }))] : [];
  const dim = opacity(stale ? 0.5 : 1);
  const surface = containerBackground(
    dark
      ? {
          type: 'linearGradient',
          colors: ['#0B1A2E', '#09090B'],
          startPoint: { x: 0, y: 0 },
          endPoint: { x: 0.55, y: 0.55 },
        }
      : '#FFFFFF',
    'widget'
  );
  const fill = frame({
    maxWidth: Infinity,
    maxHeight: Infinity,
    alignment: 'topLeading',
  });

  // An SF Symbol sized by the font of the text beside it, in a stack aligned on
  // the first text baseline, sits centred on that text.
  const glyph = (
    systemName:
      'tv' | 'bolt' | 'cpu' | 'play.display' | 'play' | 'pause' | 'exclamationmark.triangle',
    size: number,
    style: ReturnType<typeof foregroundStyle>
  ) => <Image systemName={systemName} modifiers={[font({ size, weight: 'medium' }), style]} />;
  const decisionGlyph = (row: NowPlayingRow) =>
    row.decision === 'transcode' ? (row.hardwareTranscode ? 'cpu' : 'bolt') : 'play.display';
  const decisionTone = (row: NowPlayingRow) =>
    row.decision === 'transcode' ? warning : tone(palette.direct);
  const decisionText = (row: NowPlayingRow) =>
    row.decision === 'transcode' ? row.status : join([row.decisionLabel, row.status]);

  const header = (
    <HStack alignment="firstTextBaseline" spacing={4}>
      {glyph('tv', 12, accent)}
      <Text modifiers={[font({ size: 12, weight: 'semibold' }), secondary, lineLimit(1)]}>
        {props.heading}
      </Text>
    </HStack>
  );
  const asOfText = (
    <Text modifiers={[font({ size: 11 }), stale ? warning : tertiary, lineLimit(1)]}>{asOf}</Text>
  );

  if (signedOut) {
    return (
      <VStack alignment="leading" spacing={4} modifiers={[link, fill, surface]}>
        {header}
        <Text modifiers={[font({ size: 13 }), primary]}>{props.message}</Text>
      </VStack>
    );
  }

  const empty = props.streamCount === 0;
  // A 44pt line reserves descender space the digits never use; the negative
  // padding gives it back to the rows below.
  const count = (
    <HStack alignment="firstTextBaseline" spacing={6} modifiers={[dim, padding({ bottom: -6 })]}>
      <Text
        modifiers={[
          font({ size: 44, weight: 'bold', design: 'rounded' }),
          empty ? tertiary : primary,
          lineLimit(1),
          minimumScaleFactor(0.5),
        ]}
      >
        {props.streamCount}
      </Text>
      <Text
        modifiers={[
          font({ size: 13, weight: 'medium' }),
          secondary,
          lineLimit(1),
          minimumScaleFactor(0.8),
        ]}
      >
        {props.streamUnitLabel}
      </Text>
    </HStack>
  );
  const chipText = [font({ size: 12, weight: 'medium' }), monospacedDigit(), lineLimit(1)];
  const bitrate = props.bitrateLabel ? (
    <Text modifiers={[...chipText, secondary, minimumScaleFactor(0.8)]}>{props.bitrateLabel}</Text>
  ) : null;
  // The medium summary column is too narrow for the bitrate beside the counts.
  const chips = (withBitrate: boolean) =>
    empty ? null : (
      <HStack alignment="firstTextBaseline" spacing={8} modifiers={[dim]}>
        {props.transcodeCount > 0 ? (
          <HStack alignment="firstTextBaseline" spacing={2}>
            {glyph('bolt', 12, warning)}
            <Text modifiers={[...chipText, warning]}>{props.transcodeCount}</Text>
          </HStack>
        ) : null}
        {props.directCount > 0 ? (
          <HStack alignment="firstTextBaseline" spacing={2}>
            {glyph('play.display', 12, tone(palette.direct))}
            <Text modifiers={[...chipText, tone(palette.direct)]}>{props.directCount}</Text>
          </HStack>
        ) : null}
        {withBitrate ? bitrate : null}
      </HStack>
    );
  const serversDown = props.serversDownLabel ? (
    <HStack alignment="firstTextBaseline" spacing={4}>
      {glyph('exclamationmark.triangle', 11, warning)}
      <Text modifiers={[font({ size: 11, weight: 'medium' }), warning, lineLimit(1)]}>
        {family === 'systemLarge' ? props.serversDownLabel : props.serversDownCountLabel}
      </Text>
    </HStack>
  ) : null;

  if (family !== 'systemMedium' && family !== 'systemLarge') {
    const top = props.rows[0];
    return (
      <VStack alignment="leading" spacing={0} modifiers={[link, fill, surface]}>
        {header}
        {count}
        {chips(true)}
        <Spacer />
        {top ? (
          <VStack alignment="leading" spacing={0} modifiers={[dim]}>
            <Text modifiers={[font({ size: 13, weight: 'semibold' }), primary, lineLimit(1)]}>
              {top.title}
            </Text>
            {serversDown ?? (
              <Text modifiers={[font({ size: 11 }), secondary, lineLimit(1)]}>
                {props.moreLabels[1] || top.user}
              </Text>
            )}
          </VStack>
        ) : (
          <VStack alignment="leading" spacing={0}>
            <Text modifiers={[font({ size: 13 }), secondary, lineLimit(1)]}>
              {props.emptyLabel}
            </Text>
            {serversDown}
          </VStack>
        )}
        <VStack modifiers={[padding({ top: 6 })]}>{asOfText}</VStack>
      </VStack>
    );
  }

  const large = family === 'systemLarge';
  const options = environment.configuration;
  const who = (row: NowPlayingRow) => [
    options.showEpisode ? row.episode : '',
    options.showUser ? row.user : '',
  ];
  const how = (row: NowPlayingRow) => [
    options.showPlayer ? row.player : '',
    options.showQuality ? row.quality : '',
  ];
  const showsHow = options.showPlayer || options.showQuality;
  const hasProgress = (row: NowPlayingRow) => options.showProgress && row.durationMs > 0;
  const startedAt = (row: NowPlayingRow) => props.asOfMs - row.progressMs;
  const live = (row: NowPlayingRow) => !row.paused && !stale;
  const bar = (row: NowPlayingRow) => {
    // A timer ProgressView draws its own time label under the bar unless labels are hidden.
    const barStyle = [
      labelsHidden(),
      ...(accented ? [] : [tint(row.paused ? palette.tertiary : palette.accent)]),
    ];
    return live(row) ? (
      <ProgressView
        timerInterval={{
          lower: new Date(startedAt(row)),
          upper: new Date(startedAt(row) + row.durationMs),
        }}
        countsDown={false}
        modifiers={barStyle}
      />
    ) : (
      <ProgressView value={Math.min(row.progressMs / row.durationMs, 1)} modifiers={barStyle} />
    );
  };
  const progressWithTimes = (row: NowPlayingRow) => {
    const clock = [font({ size: 11 }), monospacedDigit(), tertiary, lineLimit(1)];
    return (
      <VStack alignment="leading" spacing={3}>
        {bar(row)}
        <HStack spacing={0}>
          {live(row) ? (
            <Text
              timerInterval={{
                lower: new Date(startedAt(row)),
                upper: new Date(startedAt(row) + row.durationMs),
              }}
              countsDown={false}
              modifiers={clock}
            />
          ) : (
            <Text modifiers={clock}>{row.progressLabel}</Text>
          )}
          <Spacer />
          <Text modifiers={clock}>{row.durationLabel}</Text>
        </HStack>
      </VStack>
    );
  };
  const tile = (row: NowPlayingRow, width: number, height: number, size: number) => (
    <ZStack modifiers={[frame({ width, height }), ...tileFill(7)]}>
      {glyph(row.paused ? 'pause' : 'play', size, row.paused ? tertiary : accent)}
    </ZStack>
  );
  const detail = (text: string) =>
    text ? <Text modifiers={[font({ size: 11 }), secondary, lineLimit(1)]}>{text}</Text> : null;

  const compactRow = (row: NowPlayingRow) => (
    <Link key={row.id} destination={row.url}>
      <HStack alignment="center" spacing={10}>
        {tile(row, 28, large ? 42 : 28, 12)}
        <VStack
          alignment="leading"
          spacing={1}
          modifiers={[frame({ maxWidth: Infinity, alignment: 'leading' })]}
        >
          <Text modifiers={[font({ size: 13, weight: 'semibold' }), primary, lineLimit(1)]}>
            {row.title}
          </Text>
          {large ? (
            detail(join([...who(row), row.status]))
          ) : (
            // Medium is too narrow for the decision in words, so it gets the
            // icon-only badge the app uses on dense cards.
            <HStack alignment="firstTextBaseline" spacing={4}>
              {detail(join([...who(row), row.paused ? props.pausedLabel : '']))}
              {glyph(decisionGlyph(row), 11, decisionTone(row))}
            </HStack>
          )}
          {detail(join(how(row)))}
          {hasProgress(row) ? bar(row) : null}
        </VStack>
      </HStack>
    </Link>
  );

  // Each size fits fewer rows as the Edit Widget options grow them.
  const rowCap = large
    ? props.rowLimits.systemLarge - Number(showsHow && options.showProgress)
    : props.rowLimits.systemMedium - Number(showsHow || options.showProgress);
  const shown = Math.min(props.rows.length, rowCap);
  const more = props.moreLabels[shown] ? (
    <Text modifiers={[font({ size: 11 }), secondary, lineLimit(1)]}>{props.moreLabels[shown]}</Text>
  ) : null;
  const compactRows = (
    <VStack alignment="leading" spacing={6} modifiers={[dim]}>
      {props.rows.slice(0, shown).map(compactRow)}
      {more}
    </VStack>
  );

  if (!large) {
    const only = props.streamCount === 1 ? props.rows[0] : undefined;
    const right = empty ? (
      <Text modifiers={[font({ size: 13, weight: 'semibold' }), secondary, lineLimit(1)]}>
        {props.emptyLabel}
      </Text>
    ) : only ? (
      <Link destination={only.url}>
        <VStack alignment="leading" spacing={6} modifiers={[dim]}>
          <HStack alignment="center" spacing={10}>
            {tile(only, 28, 28, 12)}
            <VStack
              alignment="leading"
              spacing={1}
              modifiers={[frame({ maxWidth: Infinity, alignment: 'leading' })]}
            >
              <Text modifiers={[font({ size: 15, weight: 'semibold' }), primary, lineLimit(1)]}>
                {only.title}
              </Text>
              {detail(join(who(only)))}
              {detail(join([...how(only), decisionText(only)]))}
            </VStack>
          </HStack>
          {hasProgress(only) ? progressWithTimes(only) : null}
        </VStack>
      </Link>
    ) : (
      compactRows
    );
    return (
      <HStack alignment="top" spacing={0} modifiers={[link, fill, surface]}>
        <VStack
          alignment="leading"
          spacing={0}
          modifiers={[frame({ width: 110, alignment: 'topLeading' })]}
        >
          {header}
          {count}
          {chips(false)}
          {empty ? null : bitrate}
          <Spacer />
          {serversDown}
          {asOfText}
        </VStack>
        <Rectangle
          modifiers={[
            accented ? hierarchical('quaternary') : foregroundStyle(palette.rule),
            frame({ width: 1 }),
            padding({ horizontal: 12 }),
          ]}
        />
        <VStack
          alignment="leading"
          spacing={0}
          modifiers={[frame({ maxWidth: Infinity, maxHeight: Infinity, alignment: 'leading' })]}
        >
          {right}
        </VStack>
      </HStack>
    );
  }

  const stat = (value: string | number, label: string, highlight: boolean) => (
    <VStack
      alignment="leading"
      spacing={1}
      modifiers={[
        padding({ horizontal: 8, vertical: 7 }),
        frame({ maxWidth: Infinity, alignment: 'leading' }),
        ...tileFill(10),
      ]}
    >
      <Text
        modifiers={[
          font({ size: 20, weight: 'bold', design: 'rounded' }),
          monospacedDigit(),
          empty ? tertiary : highlight ? warning : primary,
          lineLimit(1),
          minimumScaleFactor(0.6),
        ]}
      >
        {value}
      </Text>
      <Text modifiers={[font({ size: 11 }), secondary, lineLimit(1), minimumScaleFactor(0.8)]}>
        {label}
      </Text>
    </VStack>
  );

  const hero = (row: NowPlayingRow) => {
    const line = (text: string) =>
      text ? <Text modifiers={[font({ size: 12 }), secondary, lineLimit(1)]}>{text}</Text> : null;
    return (
      <Link destination={row.url}>
        <VStack alignment="leading" spacing={10} modifiers={[dim]}>
          <HStack alignment="top" spacing={12}>
            {tile(row, 64, 96, 22)}
            <VStack alignment="leading" spacing={2}>
              <Text modifiers={[font({ size: 17, weight: 'semibold' }), primary, lineLimit(1)]}>
                {row.title}
              </Text>
              {options.showEpisode ? line(join([row.episode, row.episodeTitle])) : null}
              {options.showUser ? line(row.user) : null}
              {line(join(how(row)))}
              <HStack alignment="firstTextBaseline" spacing={4}>
                {glyph(decisionGlyph(row), 12, decisionTone(row))}
                <Text
                  modifiers={[
                    font({ size: 12, weight: 'medium' }),
                    decisionTone(row),
                    lineLimit(1),
                  ]}
                >
                  {decisionText(row)}
                </Text>
              </HStack>
            </VStack>
          </HStack>
          {hasProgress(row) ? progressWithTimes(row) : null}
        </VStack>
      </Link>
    );
  };

  const emptyBody = (
    <VStack alignment="center" spacing={4} modifiers={[frame({ maxWidth: Infinity })]}>
      {glyph('tv', 28, tertiary)}
      <Text modifiers={[font({ size: 15, weight: 'semibold' }), primary, lineLimit(1)]}>
        {props.emptyLabel}
      </Text>
      <Text
        modifiers={[font({ size: 12 }), secondary, multilineTextAlignment('center'), lineLimit(2)]}
      >
        {props.emptyHint}
      </Text>
    </VStack>
  );

  return (
    <VStack alignment="leading" spacing={8} modifiers={[link, fill, surface]}>
      <HStack alignment="firstTextBaseline" spacing={0}>
        {header}
        <Spacer />
        {asOfText}
      </HStack>
      <HStack spacing={6} modifiers={[dim]}>
        {stat(props.streamCount, props.statLabels.streams, false)}
        {stat(props.transcodeCount, props.statLabels.transcodes, props.transcodeCount > 0)}
        {stat(props.directCount, props.statLabels.direct, false)}
        {stat(props.bitrateValue, props.statLabels.bitrate, false)}
      </HStack>
      {empty ? <Spacer /> : null}
      {empty
        ? emptyBody
        : props.streamCount === 1 && props.rows[0]
          ? hero(props.rows[0])
          : compactRows}
      <Spacer />
      {serversDown ?? (
        <Text modifiers={[font({ size: 11 }), tertiary, lineLimit(1)]}>{props.serversOkLabel}</Text>
      )}
    </VStack>
  );
};

export default createWidget('NowPlaying', NowPlayingWidget, WIDGET_INITIAL_PROPS);
