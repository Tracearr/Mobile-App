import { colors } from '../../lib/theme';

export const PLAYBACK_COLORS = {
  directStream: colors.info,
  transcode: colors.chart[3],
} as const;

export const AXIS_COLORS = {
  lineColor: colors.border.dark,
  labelColor: colors.text.muted.dark,
};
