import {
  Box,
  Column,
  Image,
  LazyColumn,
  LinearProgressIndicator,
  Row,
  Spacer,
  Text,
} from '@expo/ui/jetpack-compose';
import {
  background,
  cornerRadius,
  createModifier,
  fillMaxSize,
  fillMaxWidth,
  height,
  padding,
  paddingAll,
  size,
  weight,
  width,
} from '@expo/ui/jetpack-compose/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';
import type { ReactNode } from 'react';
import {
  WIDGET_INITIAL_PROPS,
  type NowPlayingRow,
  type NowPlayingWidgetProps,
} from '../src/lib/nowPlayingWidget';

// Everything the layout uses is declared inside it or arrives in props: only the
// function body ships to the widget runtime, so the palette repeats src/lib/theme.ts.
// Glance has no timeline, no widget size and no opacity here, so the layout checks
// the clock when it renders, a stale snapshot is dimmed by colour alone, one layout
// serves every size, and the card gradient is a drawable from
// plugins/withWidgetDrawables.js. widgetURL and weight reach Glance through
// patches/expo-widgets@58.0.6.patch; rounded corners need Android 12, and older
// versions draw the tiles square.
const NowPlayingWidget = (props: NowPlayingWidgetProps, environment: WidgetEnvironment) => {
  'widget';
  const dark = environment.colorScheme !== 'light';
  const surface = dark ? '#09090B' : '#FFFFFF';
  const tileFill = dark ? '#18181B' : '#F4F4F5';
  const primary = dark ? '#FAFAFA' : '#09090B';
  const secondary = dark ? '#A1A1AA' : '#71717A';
  const tertiary = dark ? '#71717A' : '#A1A1AA';
  const accent = dark ? '#18D1E7' : '#0891B2';
  const accentText = dark ? '#18D1E7' : '#0E7490';
  const warning = dark ? '#F59E0B' : '#B45309';
  const direct = dark ? '#22C55E' : '#15803D';
  const track = dark ? '#27272A' : '#E4E4E7';
  const now = Date.now();
  const signedOut = props.status === 'signedOut';
  const stale = props.asOfMs > 0 && now >= props.staleAtMs;
  const asOf =
    props.asOfMs > 0 ? (now >= props.datedAtMs ? props.asOfDatedLabel : props.asOfLabel) : '';
  const join = (parts: string[]) => parts.filter(Boolean).join(' · ');
  const empty = props.streamCount === 0;

  const icon = (name: string, side: number, tint: string) => (
    <Image source={{ uri: `widget_icon_${name}` }} tint={tint} modifiers={[size(side, side)]} />
  );
  const tile = (radius: number) => [background(tileFill), cornerRadius(radius)];
  const link = (url: string) => createModifier('widgetURL', { url });

  const header = (
    <Box modifiers={[fillMaxWidth()]}>
      <Row verticalAlignment="center">
        {icon('tv', 14, accent)}
        <Spacer modifiers={[width(5)]} />
        <Text color={secondary} maxLines={1} style={{ fontSize: 12, fontWeight: 'bold' }}>
          {props.heading}
        </Text>
      </Row>
      <Box contentAlignment="centerEnd" modifiers={[fillMaxWidth(), height(16)]}>
        <Text color={stale ? warning : tertiary} maxLines={1} style={{ fontSize: 11 }}>
          {signedOut ? '' : asOf}
        </Text>
      </Box>
    </Box>
  );

  const card = (...content: ReactNode[]) => (
    <Box modifiers={[fillMaxSize(), background(surface), link(props.url)]}>
      {dark ? (
        <Image
          source={{ uri: 'widget_card_dark' }}
          contentScale="fillBounds"
          modifiers={[fillMaxSize()]}
        />
      ) : null}
      {content}
    </Box>
  );

  if (signedOut) {
    return card(
      <Column modifiers={[fillMaxSize(), paddingAll(14)]}>
        {header}
        <Spacer modifiers={[height(6)]} />
        <Text color={primary} style={{ fontSize: 13 }}>
          {props.message}
        </Text>
      </Column>
    );
  }

  const stat = (value: string, label: string, highlight: boolean) => (
    <Box modifiers={[weight(1), height(54), ...tile(10)]}>
      <Column modifiers={[padding(8, 7, 6, 7)]}>
        <Text
          color={empty || stale ? tertiary : highlight ? warning : primary}
          maxLines={1}
          style={{ fontSize: 18, fontWeight: 'bold' }}
        >
          {value}
        </Text>
        <Text color={secondary} maxLines={1} style={{ fontSize: 11 }}>
          {label}
        </Text>
      </Column>
    </Box>
  );

  const decisionIcon = (row: NowPlayingRow) =>
    row.decision === 'transcode' ? (row.hardwareTranscode ? 'cpu' : 'zap') : 'monitor_play';
  // Glance has no timer progress, so a playing row is placed where it would be
  // now and holds there until the next render.
  const progress = (row: NowPlayingRow) => {
    const elapsed = row.paused || stale ? 0 : now - props.asOfMs;
    return Math.min((row.progressMs + elapsed) / row.durationMs, 1);
  };
  const rowView = (row: NowPlayingRow) => (
    <Column key={row.id} modifiers={[fillMaxWidth(), padding(0, 0, 0, 8), link(row.url)]}>
      <Row verticalAlignment="center">
        <Box contentAlignment="center" modifiers={[size(32, 32), ...tile(7)]}>
          {icon(row.paused ? 'pause' : 'play', 14, row.paused ? tertiary : accent)}
        </Box>
        <Spacer modifiers={[width(10)]} />
        <Column modifiers={[fillMaxWidth()]}>
          <Text
            color={stale ? secondary : primary}
            maxLines={1}
            style={{ fontSize: 13, fontWeight: 'bold' }}
          >
            {row.title}
          </Text>
          <Row verticalAlignment="center">
            <Text color={secondary} maxLines={1} style={{ fontSize: 11 }}>
              {join([row.user, row.paused ? props.pausedLabel : ''])}
            </Text>
            <Spacer modifiers={[width(4)]} />
            {icon(decisionIcon(row), 12, row.decision === 'transcode' ? warning : direct)}
          </Row>
          {row.durationMs > 0 ? <Spacer modifiers={[height(4)]} /> : null}
          {row.durationMs > 0 ? (
            <LinearProgressIndicator
              progress={progress(row)}
              color={row.paused ? tertiary : accent}
              trackColor={track}
              modifiers={[fillMaxWidth(), height(3)]}
            />
          ) : null}
        </Column>
      </Row>
    </Column>
  );

  const footer = (
    <Box contentAlignment="bottomStart" modifiers={[fillMaxSize(), paddingAll(14)]}>
      {props.serversDownLabel ? (
        <Row verticalAlignment="center">
          {icon('triangle_alert', 12, warning)}
          <Spacer modifiers={[width(4)]} />
          <Text color={warning} maxLines={1} style={{ fontSize: 11, fontWeight: 'bold' }}>
            {props.serversDownLabel}
          </Text>
        </Row>
      ) : (
        <Text color={tertiary} maxLines={1} style={{ fontSize: 11 }}>
          {props.serversOkLabel}
        </Text>
      )}
    </Box>
  );

  return card(
    <Column modifiers={[fillMaxSize(), padding(14, 14, 14, 34)]}>
      {header}
      <Spacer modifiers={[height(4)]} />
      <Row verticalAlignment="bottom">
        <Text
          color={stale || empty ? tertiary : accentText}
          maxLines={1}
          style={{ fontSize: 36, fontWeight: 'bold' }}
        >
          {String(props.streamCount)}
        </Text>
        <Spacer modifiers={[width(6)]} />
        {/* Glance has no baseline alignment; the padding sets the word on the count's baseline. */}
        <Text
          color={secondary}
          maxLines={1}
          style={{ fontSize: 13, fontWeight: 'bold' }}
          modifiers={[padding(0, 0, 0, 5)]}
        >
          {props.streamUnitLabel}
        </Text>
      </Row>
      <Spacer modifiers={[height(8)]} />
      <Row modifiers={[fillMaxWidth()]}>
        {stat(String(props.transcodeCount), props.statLabels.transcodes, props.transcodeCount > 0)}
        <Spacer modifiers={[width(6)]} />
        {stat(String(props.directCount), props.statLabels.direct, false)}
        <Spacer modifiers={[width(6)]} />
        {stat(props.bitrateValue, props.statLabels.bitrate, false)}
      </Row>
      <Spacer modifiers={[height(12)]} />
      {empty ? (
        <Box contentAlignment="center" modifiers={[fillMaxSize()]}>
          <Column horizontalAlignment="center">
            {icon('tv', 28, tertiary)}
            <Spacer modifiers={[height(6)]} />
            <Text color={primary} maxLines={1} style={{ fontSize: 15, fontWeight: 'bold' }}>
              {props.emptyLabel}
            </Text>
            <Text color={secondary} maxLines={2} style={{ fontSize: 12, textAlign: 'center' }}>
              {props.emptyHint}
            </Text>
          </Column>
        </Box>
      ) : (
        <LazyColumn modifiers={[fillMaxWidth()]}>
          {props.rows.map(rowView)}
          {props.moreLabels[props.rows.length] ? (
            <Text color={secondary} maxLines={1} style={{ fontSize: 11 }}>
              {props.moreLabels[props.rows.length]}
            </Text>
          ) : null}
        </LazyColumn>
      )}
    </Column>,
    footer
  );
};

export default createWidget('NowPlaying', NowPlayingWidget, WIDGET_INITIAL_PROPS);
