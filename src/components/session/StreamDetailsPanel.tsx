/**
 * Stream Details Panel - displays source vs stream codec information
 * Mobile port of web/src/components/history/StreamDetailsPanel.tsx
 */
import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { ArrowRight, Video, AudioLines, Subtitles, Cpu, ChevronDown } from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { Badge } from '@/components/ui/badge';
import { colors } from '@/lib/theme';
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
    <View className="flex-row items-center py-0.5">
      <Text className="text-muted-foreground w-20 text-[13px]">{label}</Text>
      <Text
        className={`flex-1 text-[13px] font-medium ${highlight ? 'text-warning' : ''}`}
        numberOfLines={1}
      >
        {sourceValue}
      </Text>
      {showArrow && streamValue !== undefined ? (
        <View className="w-5 items-center">
          <ArrowRight size={12} color={isDifferent ? colors.warning : colors.text.muted.dark} />
        </View>
      ) : (
        <View className="w-5" />
      )}
      {streamValue !== undefined && (
        <Text
          className={`flex-1 text-[13px] ${isDifferent ? 'text-warning font-medium' : ''}`}
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
    <View className="flex-row items-center justify-between py-2">
      <View className="flex-row items-center gap-2">
        <Icon size={16} color={colors.icon.default} />
        <Text className="text-sm font-medium">{title}</Text>
      </View>
      {badge}
    </View>
  );
}

// Column labels
function SectionColumnLabels() {
  return (
    <View className="border-border mb-1 flex-row items-center border-b pb-1">
      <View className="w-20" />
      <Text className="text-muted-foreground flex-1 text-[9px] font-medium tracking-wider">
        SOURCE
      </Text>
      <View className="w-5" />
      <Text className="text-muted-foreground flex-1 text-[9px] font-medium tracking-wider">
        STREAM
      </Text>
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
    return (
      <Text className="text-muted-foreground py-2 text-sm">
        No detailed stream information available
      </Text>
    );
  }

  const videoBadge = getDecisionBadge(videoDecision);
  const audioBadge = getDecisionBadge(audioDecision);
  const transcodeReasons = transcodeInfo?.reasons ?? [];
  const videoTranscodeReasons = filterTranscodeReasons(transcodeReasons, 'video');
  const audioTranscodeReasons = filterTranscodeReasons(transcodeReasons, 'audio');

  return (
    <View className="gap-2">
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
          <View className="bg-border h-px" />
        </>
      )}

      {/* Video Section */}
      {hasVideoDetails && (
        <>
          <View className="bg-border h-px opacity-50" />
          <SectionHeader
            icon={Video}
            title="Video"
            badge={<Badge variant={videoBadge.variant}>{videoBadge.label}</Badge>}
          />
          <View className="border-border gap-0.5 rounded-lg border p-2">
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
          <View className="border-border gap-0.5 rounded-lg border p-2">
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
          <View className="border-border rounded-lg border p-2">
            <View className="flex-row items-center gap-2">
              <Text className="text-muted-foreground text-[13px]">Format:</Text>
              <Text className="text-[13px]">{formatCodec(subtitleInfo?.codec)}</Text>
              {subtitleInfo?.language && (
                <>
                  <Text className="text-muted-foreground text-[13px]">·</Text>
                  <Text className="text-[13px]">{subtitleInfo.language}</Text>
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
            className="flex-row items-center justify-between py-2"
            onPress={() => setTranscodeOpen(!transcodeOpen)}
          >
            <View className="flex-row items-center gap-2">
              <Cpu size={16} color={colors.icon.default} />
              <Text className="text-muted-foreground text-sm font-medium">Transcode Details</Text>
            </View>
            <ChevronDown
              size={16}
              color={colors.icon.default}
              style={{ transform: [{ rotate: transcodeOpen ? '180deg' : '0deg' }] }}
            />
          </Pressable>
          {transcodeOpen && (
            <View className="border-border gap-0.5 rounded-lg border p-2">
              {transcodeInfo?.hwDecoding && (
                <View className="flex-row items-center justify-between py-0.5">
                  <Text className="text-muted-foreground text-[13px]">HW Decode</Text>
                  <Text className="text-[13px]">{transcodeInfo.hwDecoding}</Text>
                </View>
              )}
              {transcodeInfo?.hwEncoding && (
                <View className="flex-row items-center justify-between py-0.5">
                  <Text className="text-muted-foreground text-[13px]">HW Encode</Text>
                  <Text className="text-[13px]">{transcodeInfo.hwEncoding}</Text>
                </View>
              )}
              {transcodeInfo?.speed !== undefined && (
                <View className="flex-row items-center justify-between py-0.5">
                  <Text className="text-muted-foreground text-[13px]">Speed</Text>
                  <Text className={`text-[13px] ${transcodeInfo.speed < 1 ? 'text-warning' : ''}`}>
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
        <View className="border-border flex-row items-center justify-between border-t pt-1">
          <Text className="text-muted-foreground text-[13px]">Total Bitrate</Text>
          <Text className="text-[13px] font-medium">{formatBitrate(bitrate)}</Text>
        </View>
      )}
    </View>
  );
}
