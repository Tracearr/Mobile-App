import { colors } from '../../lib/theme';

export const PLAYBACK_COLORS = {
  direct: colors.chart[0],
  directStream: colors.chart[3],
  transcode: colors.chart[1],
} as const;

export const AXIS_COLORS = {
  lineColor: colors.border.dark,
  labelColor: colors.text.muted.dark,
};
