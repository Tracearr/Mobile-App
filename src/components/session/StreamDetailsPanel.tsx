/**
 * Stream Details Panel - displays source vs stream codec information
 * Mobile port of web/src/components/history/StreamDetailsPanel.tsx
 */
import React, { useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { ArrowRight, Video, AudioLines, Subtitles, Cpu, ChevronDown } from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { Badge } from '@/components/ui/badge';
import { colors, spacing, borderRadius } from '@/lib/theme';
import type {
  SourceVideoDetails,
  SourceAudioDetails,
  StreamVideoDetails,
  StreamAudioDetails,
  TranscodeInfo,
  SubtitleInfo,
  ServerType,
} from '@tracearr/shared';

interface StreamDetailsPanelProps {
  // Scalar codec fields
  sourceVideoCodec: string | null;
  sourceAudioCodec: string | null;
  sourceAudioChannels: number | null;
  sourceVideoWidth: number | null;
  sourceVideoHeight: number | null;
  streamVideoCodec: string | null;
  streamAudioCodec: string | null;
  // JSONB detail objects
  sourceVideoDetails: SourceVideoDetails | null;
  sourceAudioDetails: SourceAudioDetails | null;
  streamVideoDetails: StreamVideoDetails | null;
  streamAudioDetails: StreamAudioDetails | null;
  transcodeInfo: TranscodeInfo | null;
  subtitleInfo: SubtitleInfo | null;
  // Decisions
  videoDecision: string | null;
  audioDecision: string | null;
  bitrate: number | null;
  // Server type for conditional display
  serverType: ServerType;
}

// Format bitrate for display
function formatBitrate(bitrate: number | null | undefined): string {
  if (!bitrate) return '—';
  if (bitrate >= 1000) {
    const mbps = bitrate / 1000;
    const formatted = mbps % 1 === 0 ? mbps.toFixed(0) : mbps.toFixed(1);
    return `${formatted} Mbps`;
  }
  return `${bitrate} kbps`;
}

// Format resolution using width-first logic
function formatResolution(
  width: number | null | undefined,
  height: number | null | undefined
): string {
  if (!width && !height) return '—';

  let label: string | undefined;
  if (width) {
    if (width >= 3840) label = '4K';
    else if (width >= 1920) label = '1080p';
    else if (width >= 1280) label = '720p';
    else if (width >= 854) label = '480p';
    else label = 'SD';
  } else if (height) {
    if (height >= 2160) label = '4K';
    else if (height >= 1080) label = '1080p';
    else if (height >= 720) label = '720p';
    else if (height >= 480) label = '480p';
    else label = 'SD';
  }

  if (width && height) return `${width}×${height} (${label})`;
  if (width) return `${width}w (${label})`;
  if (height) return `${height}p (${label})`;
  return '—';
}

// Format channels
function formatChannels(channels: number | null | undefined): string {
  if (!channels) return '—';
  if (channels === 8) return '7.1';
  if (channels === 6) return '5.1';
  if (channels === 2) return 'Stereo';
  if (channels === 1) return 'Mono';
  return `${channels}ch`;
}

function formatFramerate(framerate: string | number | null | undefined): string {
  if (framerate === null || framerate === undefined || framerate === '') return '—';
  const numeric = typeof framerate === 'number' ? framerate : parseFloat(String(framerate));
  if (Number.isNaN(numeric)) return String(framerate);
  return numeric % 1 === 0 ? numeric.toFixed(0) : numeric.toFixed(1);
}

// Get decision badge variant and label
function getDecisionBadge(decision: string | null): {
  variant: 'success' | 'warning' | 'secondary';
  label: string;
} {
  switch (decision) {
    case 'directplay':
      return { variant: 'success', label: 'Direct Play' };
    case 'copy':
      return { variant: 'success', label: 'Direct Stream' };
    case 'transcode':
      return { variant: 'warning', label: 'Transcode' };
    case 'burn':
      return { variant: 'warning', label: 'Burn-in' };
    default:
      return { variant: 'secondary', label: '—' };
  }
}

// Format codec name for display
function formatCodec(codec: string | null | undefined): string {
  if (!codec) return '—';
  const upper = codec.toUpperCase();
  if (
    [
      'H264',
      'H265',
      'HEVC',
      'AV1',
      'VP9',
      'AAC',
      'AC3',
      'EAC3',
      'DTS',
      'TRUEHD',
      'FLAC',
      'OPUS',
    ].includes(upper)
  ) {
    return upper;
  }
  return codec.charAt(0).toUpperCase() + codec.slice(1);
}

function formatTranscodeReason(reason: string): string {
  return reason
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .trim();
}

function filterTranscodeReasons(reasons: string[] | null | undefined, keyword: string): string[] {
  if (!reasons || reasons.length === 0) return [];
  const needle = keyword.toLowerCase();
  return reasons
    .filter((reason) => reason.toLowerCase().includes(needle))
    .map(formatTranscodeReason);
}

// Comparison row component
function ComparisonRow({
  label,
  sourceValue,
  streamValue,
  showArrow = true,
  highlight = false,
}: {
  label: string;
  sourceValue: string;
  streamValue?: string;
  showArrow?: boolean;
  highlight?: boolean;
}) {
  const isDifferent =
    streamValue && sourceValue !== streamValue && sourceValue !== '—' && streamValue !== '—';

  return (
    <View style={styles.comparisonRow}>
      <Text style={styles.comparisonLabel}>{label}</Text>
      <Text style={[styles.comparisonSource, highlight && styles.highlightText]} numberOfLines={1}>
        {sourceValue}
      </Text>
      {showArrow && streamValue !== undefined ? (
        <ArrowRight
          size={12}
          color={isDifferent ? colors.warning : colors.text.muted.dark}
          style={styles.comparisonArrow}
        />
      ) : (
        <View style={styles.comparisonArrow} />
      )}
      {streamValue !== undefined && (
        <Text
          style={[styles.comparisonStream, isDifferent && styles.changedText]}
          numberOfLines={1}
        >
          {streamValue}
        </Text>
      )}
    </View>
  );
}

// Section header
function SectionHeader({
  icon: Icon,
  title,
  badge,
}: {
  icon: typeof Video;
  title: string;
  badge?: React.ReactNode;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderLeft}>
        <Icon size={16} color={colors.text.muted.dark} />
        <Text style={styles.sectionHeaderTitle}>{title}</Text>
      </View>
      {badge}
    </View>
  );
}

// Column labels
function SectionColumnLabels() {
  return (
    <View style={styles.columnLabels}>
      <View style={styles.columnLabelSpacer} />
      <Text style={styles.columnLabel}>SOURCE</Text>
      <View style={styles.columnArrowSpacer} />
      <Text style={styles.columnLabel}>STREAM</Text>
    </View>
  );
}

export function StreamDetailsPanel({
  sourceVideoCodec,
  sourceAudioCodec,
  sourceAudioChannels,
  sourceVideoWidth,
  sourceVideoHeight,
  streamVideoCodec,
  streamAudioCodec,
  sourceVideoDetails,
  sourceAudioDetails,
  streamVideoDetails,
  streamAudioDetails,
  transcodeInfo,
  subtitleInfo,
  videoDecision,
  audioDecision,
  bitrate,
  serverType,
}: StreamDetailsPanelProps) {
  const [transcodeOpen, setTranscodeOpen] = useState(false);

  const hasVideoDetails = sourceVideoCodec || streamVideoCodec || sourceVideoWidth;
  const hasAudioDetails = sourceAudioCodec || streamAudioCodec || sourceAudioChannels;
  const hasSubtitleDetails = subtitleInfo?.codec || subtitleInfo?.language;
  const hasTranscodeDetails =
    transcodeInfo && (transcodeInfo.hwDecoding || transcodeInfo.hwEncoding || transcodeInfo.speed);

  if (!hasVideoDetails && !hasAudioDetails) {
    return <Text style={styles.noDetails}>No detailed stream information available</Text>;
  }

  const videoBadge = getDecisionBadge(videoDecision);
  const audioBadge = getDecisionBadge(audioDecision);
  const transcodeReasons = transcodeInfo?.reasons ?? [];
  const videoTranscodeReasons = filterTranscodeReasons(transcodeReasons, 'video');
  const audioTranscodeReasons = filterTranscodeReasons(transcodeReasons, 'audio');

  return (
    <View style={styles.container}>
      {/* Container info */}
      {transcodeInfo?.sourceContainer && (
        <>
          <ComparisonRow
            label="Container"
            sourceValue={transcodeInfo.sourceContainer.toUpperCase()}
            streamValue={
              transcodeInfo.streamContainer?.toUpperCase() ??
              transcodeInfo.sourceContainer.toUpperCase()
            }
          />
          <View style={styles.separator} />
        </>
      )}

      {/* Video Section */}
      {hasVideoDetails && (
        <>
          <View style={styles.separatorLight} />
          <SectionHeader
            icon={Video}
            title="Video"
            badge={<Badge variant={videoBadge.variant}>{videoBadge.label}</Badge>}
          />
          <View style={styles.detailsBox}>
            <SectionColumnLabels />
            <ComparisonRow
              label="Codec"
              sourceValue={formatCodec(sourceVideoCodec)}
              streamValue={formatCodec(streamVideoCodec ?? sourceVideoCodec)}
            />
            <ComparisonRow
              label="Resolution"
              sourceValue={formatResolution(sourceVideoWidth, sourceVideoHeight)}
              streamValue={formatResolution(
                streamVideoDetails?.width ?? sourceVideoWidth,
                streamVideoDetails?.height ?? sourceVideoHeight
              )}
            />
            <ComparisonRow
              label="Bitrate"
              sourceValue={formatBitrate(sourceVideoDetails?.bitrate)}
              streamValue={
                // Show N/A for Jellyfin/Emby transcodes without stream bitrate
                videoDecision === 'transcode' &&
                !streamVideoDetails?.bitrate &&
                serverType !== 'plex'
                  ? 'N/A'
                  : formatBitrate(streamVideoDetails?.bitrate ?? sourceVideoDetails?.bitrate)
              }
            />
            {sourceVideoDetails?.framerate && (
              <ComparisonRow
                label="Framerate"
                sourceValue={formatFramerate(sourceVideoDetails.framerate)}
                streamValue={formatFramerate(
                  streamVideoDetails?.framerate ?? sourceVideoDetails.framerate
                )}
              />
            )}
            {sourceVideoDetails?.dynamicRange && (
              <ComparisonRow
                label="HDR"
                sourceValue={sourceVideoDetails.dynamicRange}
                streamValue={streamVideoDetails?.dynamicRange ?? sourceVideoDetails.dynamicRange}
              />
            )}
            {sourceVideoDetails?.profile && (
              <ComparisonRow
                label="Profile"
                sourceValue={sourceVideoDetails.profile}
                showArrow={false}
              />
            )}
            {sourceVideoDetails?.colorSpace && (
              <ComparisonRow
                label="Color"
                sourceValue={`${sourceVideoDetails.colorSpace}${sourceVideoDetails.colorDepth ? ` ${sourceVideoDetails.colorDepth}bit` : ''}`}
                showArrow={false}
              />
            )}
            {videoDecision === 'transcode' && videoTranscodeReasons.length > 0 && (
              <ComparisonRow
                label="Reason"
                sourceValue={videoTranscodeReasons.join(', ')}
                showArrow={false}
                highlight
              />
            )}
          </View>
        </>
      )}

      {/* Audio Section */}
      {hasAudioDetails && (
        <>
          <SectionHeader
            icon={AudioLines}
            title="Audio"
            badge={<Badge variant={audioBadge.variant}>{audioBadge.label}</Badge>}
          />
          <View style={styles.detailsBox}>
            <SectionColumnLabels />
            <ComparisonRow
              label="Codec"
              sourceValue={formatCodec(sourceAudioCodec)}
              streamValue={formatCodec(streamAudioCodec ?? sourceAudioCodec)}
            />
            <ComparisonRow
              label="Channels"
              sourceValue={formatChannels(sourceAudioChannels)}
              streamValue={formatChannels(streamAudioDetails?.channels ?? sourceAudioChannels)}
            />
            <ComparisonRow
              label="Bitrate"
              sourceValue={formatBitrate(sourceAudioDetails?.bitrate)}
              streamValue={
                // Show N/A for Jellyfin/Emby transcodes without stream bitrate
                audioDecision === 'transcode' &&
                !streamAudioDetails?.bitrate &&
                serverType !== 'plex'
                  ? 'N/A'
                  : formatBitrate(streamAudioDetails?.bitrate ?? sourceAudioDetails?.bitrate)
              }
            />
            {sourceAudioDetails?.language && (
              <ComparisonRow
                label="Language"
                sourceValue={sourceAudioDetails.language}
                streamValue={streamAudioDetails?.language ?? sourceAudioDetails.language}
              />
            )}
            {sourceAudioDetails?.sampleRate && (
              <ComparisonRow
                label="Sample Rate"
                sourceValue={`${sourceAudioDetails.sampleRate / 1000} kHz`}
                showArrow={false}
              />
            )}
            {audioDecision === 'transcode' && audioTranscodeReasons.length > 0 && (
              <ComparisonRow
                label="Reason"
                sourceValue={audioTranscodeReasons.join(', ')}
                showArrow={false}
                highlight
              />
            )}
          </View>
        </>
      )}

      {/* Subtitles Section */}
      {hasSubtitleDetails && (
        <>
          <SectionHeader
            icon={Subtitles}
            title="Subtitles"
            badge={
              subtitleInfo?.decision ? (
                <Badge variant={getDecisionBadge(subtitleInfo.decision).variant}>
                  {getDecisionBadge(subtitleInfo.decision).label}
                </Badge>
              ) : undefined
            }
          />
          <View style={styles.detailsBox}>
            <View style={styles.subtitleRow}>
              <Text style={styles.subtitleLabel}>Format:</Text>
              <Text style={styles.subtitleValue}>{formatCodec(subtitleInfo?.codec)}</Text>
              {subtitleInfo?.language && (
                <>
                  <Text style={styles.subtitleDot}>·</Text>
                  <Text style={styles.subtitleValue}>{subtitleInfo.language}</Text>
                </>
              )}
              {subtitleInfo?.forced && <Badge variant="outline">Forced</Badge>}
            </View>
          </View>
        </>
      )}

      {/* Transcode Details (collapsible) */}
      {hasTranscodeDetails && (
        <>
          <Pressable
            style={styles.collapsibleHeader}
            onPress={() => setTranscodeOpen(!transcodeOpen)}
          >
            <View style={styles.collapsibleHeaderLeft}>
              <Cpu size={16} color={colors.text.muted.dark} />
              <Text style={styles.collapsibleHeaderTitle}>Transcode Details</Text>
            </View>
            <ChevronDown
              size={16}
              color={colors.text.muted.dark}
              style={{ transform: [{ rotate: transcodeOpen ? '180deg' : '0deg' }] }}
            />
          </Pressable>
          {transcodeOpen && (
            <View style={styles.detailsBox}>
              {transcodeInfo?.hwDecoding && (
                <View style={styles.transcodeRow}>
                  <Text style={styles.transcodeLabel}>HW Decode</Text>
                  <Text style={styles.transcodeValue}>{transcodeInfo.hwDecoding}</Text>
                </View>
              )}
              {transcodeInfo?.hwEncoding && (
                <View style={styles.transcodeRow}>
                  <Text style={styles.transcodeLabel}>HW Encode</Text>
                  <Text style={styles.transcodeValue}>{transcodeInfo.hwEncoding}</Text>
                </View>
              )}
              {transcodeInfo?.speed !== undefined && (
                <View style={styles.transcodeRow}>
                  <Text style={styles.transcodeLabel}>Speed</Text>
                  <Text
                    style={[styles.transcodeValue, transcodeInfo.speed < 1 && styles.warningText]}
                  >
                    {transcodeInfo.speed.toFixed(1)}x{transcodeInfo.throttled && ' (throttled)'}
                  </Text>
                </View>
              )}
            </View>
          )}
        </>
      )}

      {/* Overall bitrate */}
      {bitrate && (
        <View style={styles.bitrateRow}>
          <Text style={styles.bitrateLabel}>Total Bitrate</Text>
          <Text style={styles.bitrateValue}>{formatBitrate(bitrate)}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  noDetails: {
    color: colors.text.muted.dark,
    fontSize: 14,
    paddingVertical: spacing.sm,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border.dark,
  },
  separatorLight: {
    height: 1,
    backgroundColor: colors.border.dark,
    opacity: 0.5,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionHeaderTitle: {
    color: colors.text.primary.dark,
    fontSize: 14,
    fontWeight: '500',
  },
  detailsBox: {
    borderWidth: 1,
    borderColor: colors.border.dark,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    gap: 2,
  },
  columnLabels: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border.dark,
    paddingBottom: spacing.xs,
    marginBottom: spacing.xs,
  },
  columnLabelSpacer: {
    width: 80,
  },
  columnLabel: {
    flex: 1,
    color: colors.text.muted.dark,
    fontSize: 9,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  columnArrowSpacer: {
    width: 20,
  },
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
  },
  comparisonLabel: {
    width: 80,
    color: colors.text.muted.dark,
    fontSize: 13,
  },
  comparisonSource: {
    flex: 1,
    color: colors.text.primary.dark,
    fontSize: 13,
    fontWeight: '500',
  },
  comparisonArrow: {
    width: 20,
    alignItems: 'center',
  },
  comparisonStream: {
    flex: 1,
    color: colors.text.primary.dark,
    fontSize: 13,
  },
  changedText: {
    color: colors.warning,
    fontWeight: '500',
  },
  highlightText: {
    color: colors.warning,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  subtitleLabel: {
    color: colors.text.muted.dark,
    fontSize: 13,
  },
  subtitleValue: {
    color: colors.text.primary.dark,
    fontSize: 13,
  },
  subtitleDot: {
    color: colors.text.muted.dark,
    fontSize: 13,
  },
  collapsibleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  collapsibleHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  collapsibleHeaderTitle: {
    color: colors.text.muted.dark,
    fontSize: 14,
    fontWeight: '500',
  },
  transcodeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  transcodeLabel: {
    color: colors.text.muted.dark,
    fontSize: 13,
  },
  transcodeValue: {
    color: colors.text.primary.dark,
    fontSize: 13,
  },
  warningText: {
    color: colors.warning,
  },
  bitrateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.border.dark,
    paddingTop: spacing.xs,
  },
  bitrateLabel: {
    color: colors.text.muted.dark,
    fontSize: 13,
  },
  bitrateValue: {
    color: colors.text.primary.dark,
    fontSize: 13,
    fontWeight: '500',
  },
});
