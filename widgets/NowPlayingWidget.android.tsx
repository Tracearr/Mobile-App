import { Column, Row, Spacer, Text } from '@expo/ui/jetpack-compose';
import {
  background,
  fillMaxSize,
  fillMaxWidth,
  height,
  paddingAll,
  width,
} from '@expo/ui/jetpack-compose/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';
import { WIDGET_INITIAL_PROPS, type NowPlayingWidgetProps } from '../src/lib/nowPlayingWidget';

// Everything the layout uses is declared inside it or arrives in props: only the
// function body ships to the widget runtime. Glance has no timeline, no widget
// size, no opacity and no tap-to-open URL here, so the layout checks the clock
// when it renders and a stale snapshot is dimmed by colour alone.
const NowPlayingWidget = (props: NowPlayingWidgetProps, environment: WidgetEnvironment) => {
  'widget';
  const dark = environment.colorScheme !== 'light';
  const surface = dark ? '#09090B' : '#FFFFFF';
  const primary = dark ? '#FAFAFA' : '#09090B';
  const secondary = dark ? '#A1A1AA' : '#71717A';
  const warning = '#F59E0B';
  const now = Date.now();
  const signedOut = props.status === 'signedOut';
  const stale = props.asOfMs > 0 && now >= props.staleAtMs;
  const asOf =
    props.asOfMs > 0 ? (now >= props.datedAtMs ? props.asOfDatedLabel : props.asOfLabel) : '';
  const countColor = stale ? secondary : primary;

  const heading = (
    <Text color={secondary} maxLines={1} style={{ fontSize: 12, fontWeight: 'bold' }}>
      {props.heading}
    </Text>
  );

  if (signedOut) {
    return (
      <Column modifiers={[fillMaxSize(), background(surface), paddingAll(12)]}>
        {heading}
        <Spacer modifiers={[height(4)]} />
        <Text color={primary} style={{ fontSize: 13 }}>
          {props.message}
        </Text>
      </Column>
    );
  }

  return (
    <Row modifiers={[fillMaxSize(), background(surface), paddingAll(12)]}>
      <Column modifiers={[width(112)]}>
        {heading}
        <Text color={countColor} maxLines={1} style={{ fontSize: 36, fontWeight: 'bold' }}>
          {String(props.streamCount)}
        </Text>
        <Text color={countColor} maxLines={1} style={{ fontSize: 13, fontWeight: 'bold' }}>
          {props.streamsLabel}
        </Text>
        {props.transcodesLabel ? (
          <Text color={secondary} maxLines={1} style={{ fontSize: 12 }}>
            {props.transcodesLabel}
          </Text>
        ) : null}
        {props.serversDownLabel ? (
          <Text color={warning} maxLines={2} style={{ fontSize: 11, fontWeight: 'bold' }}>
            {props.serversDownLabel}
          </Text>
        ) : null}
        <Text color={stale ? warning : secondary} maxLines={1} style={{ fontSize: 11 }}>
          {asOf}
        </Text>
      </Column>
      <Spacer modifiers={[width(8)]} />
      <Column modifiers={[fillMaxWidth()]}>
        {props.rows.length === 0 ? (
          <Text color={secondary} style={{ fontSize: 13 }}>
            {props.emptyLabel}
          </Text>
        ) : (
          props.rows.map((row) => (
            <Column key={row.id} modifiers={[fillMaxWidth()]}>
              <Text color={countColor} maxLines={1} style={{ fontSize: 13, fontWeight: 'bold' }}>
                {row.title}
              </Text>
              <Text color={secondary} maxLines={1} style={{ fontSize: 11 }}>
                {row.detail}
              </Text>
              <Spacer modifiers={[height(6)]} />
            </Column>
          ))
        )}
      </Column>
    </Row>
  );
};

export default createWidget('NowPlaying', NowPlayingWidget, WIDGET_INITIAL_PROPS);
