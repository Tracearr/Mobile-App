/**
 * Stream Details Panel - displays source vs stream codec information
 * Mobile port of web/src/components/history/StreamDetailsPanel.tsx
 */
import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { ArrowRight, Video, AudioLines, Subtitles, Cpu, ChevronDown } from 'lucide-react-native';
import { useTranslation } from '@tracearr/translations/mobile';
import { Text } from '@/components/ui/text';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { colors, withAlpha, ACCENT_COLOR } from '@/lib/theme';
import {
  PLAYBACK_DECISION_LABEL_KEYS,
  formatMediaTech,
  formatResolutionDisplay,
  type SourceVideoDetails,
  type SourceAudioDetails,
  type StreamVideoDetails,
  type StreamAudioDetails,
  type TranscodeInfo,
  type SubtitleInfo,
  type ServerType,
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

const EMPTY = '-';

// Format bitrate for display
function formatBitrate(bitrate: number | null | undefined): string {
  if (!bitrate) return EMPTY;
  if (bitrate >= 1000) {
    const mbps = bitrate / 1000;
    const formatted = mbps % 1 === 0 ? mbps.toFixed(0) : mbps.toFixed(1);
    return `${formatted} Mbps`;
  }
  return `${bitrate} kbps`;
}

function formatFramerate(framerate: string | number | null | undefined): string {
  if (framerate === null || framerate === undefined || framerate === '') return EMPTY;
  const numeric = typeof framerate === 'number' ? framerate : parseFloat(String(framerate));
  if (Number.isNaN(numeric)) return String(framerate);
  return numeric % 1 === 0 ? numeric.toFixed(0) : numeric.toFixed(1);
}

function getDecisionVariant(decision: string | null): 'success' | 'warning' | 'secondary' {
  switch (decision) {
    case 'directplay':
    case 'copy':
      return 'success';
    case 'transcode':
    case 'burn':
      return 'warning';
    default:
      return 'secondary';
  }
}

function formatCodec(codec: string | null | undefined): string {
  return codec ? formatMediaTech(codec) : EMPTY;
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

// Comparison row component - uses consistent column structure matching SectionColumnLabels
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
    !!streamValue && sourceValue !== streamValue && sourceValue !== EMPTY && streamValue !== EMPTY;

  return (
    <View className="flex-row items-center py-0.5">
      <Text className="text-muted-foreground w-20 text-[13px]">{label}</Text>
      <View className="flex-1">
        <Text
          className={cn('text-[13px] font-medium', highlight ? 'text-warning' : 'text-foreground')}
          numberOfLines={1}
        >
          {sourceValue}
        </Text>
      </View>
      <View className="w-6 items-center">
        {showArrow && streamValue !== undefined ? (
          <ArrowRight
            size={12}
            color={isDifferent ? colors.warning : withAlpha(colors.text.muted.dark, '80')}
          />
        ) : null}
      </View>
      <View className="flex-1">
        {streamValue !== undefined && (
          <Text
            className={cn(
              'text-[13px]',
              isDifferent ? 'text-warning font-medium' : 'text-foreground'
            )}
            numberOfLines={1}
          >
            {streamValue}
          </Text>
        )}
      </View>
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
        <Icon size={16} color={ACCENT_COLOR} />
        <Text className="text-foreground text-sm font-medium">{title}</Text>
      </View>
      {badge}
    </View>
  );
}

// Column labels
function SectionColumnLabels() {
  const { t } = useTranslation(['mobile']);
  return (
    <View className="border-border mb-1 flex-row items-center border-b pb-1">
      <View className="w-20" />
      <View className="flex-1">
        <Text className="text-muted-foreground text-[9px] font-medium tracking-wider uppercase">
          {t('mobile:streamDetails.source', { defaultValue: 'Source' })}
        </Text>
      </View>
      <View className="w-6" />
      <View className="flex-1">
        <Text className="text-muted-foreground text-[9px] font-medium tracking-wider uppercase">
          {t('mobile:streamDetails.stream', { defaultValue: 'Stream' })}
        </Text>
      </View>
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
  const { t } = useTranslation(['mobile', 'common', 'pages']);
  const [transcodeOpen, setTranscodeOpen] = useState(false);

  // Booleans, not the raw values: a bare 0 or '' from `value && <View />` crashes outside <Text>.
  const hasVideoDetails = !!(sourceVideoCodec || streamVideoCodec || sourceVideoWidth);
  const hasAudioDetails = !!(sourceAudioCodec || streamAudioCodec || sourceAudioChannels);
  const hasSubtitleDetails = !!(subtitleInfo?.codec || subtitleInfo?.language);
  const hasTranscodeDetails = !!(
    transcodeInfo?.hwDecoding ||
    transcodeInfo?.hwEncoding ||
    transcodeInfo?.speed
  );

  if (!hasVideoDetails && !hasAudioDetails) {
    return (
      <Text className="text-muted-foreground py-2 text-sm">
        {t('mobile:streamDetails.noDetails', {
          defaultValue: 'No detailed stream information available',
        })}
      </Text>
    );
  }

  const decisionLabel = (decision: string | null): string => {
    switch (decision) {
      case 'directplay':
      case 'copy':
      case 'transcode':
        return t(PLAYBACK_DECISION_LABEL_KEYS[decision], { ns: 'common' });
      case 'burn':
        return t('common:playback.burnIn', { defaultValue: 'Burn-in' });
      default:
        return EMPTY;
    }
  };
  const formatChannels = (channels: number | null | undefined): string => {
    if (!channels) return EMPTY;
    if (channels === 8) return '7.1';
    if (channels === 6) return '5.1';
    if (channels === 2) return t('mobile:streamDetails.stereo', { defaultValue: 'Stereo' });
    if (channels === 1) return t('mobile:streamDetails.mono', { defaultValue: 'Mono' });
    return `${channels}ch`;
  };
  const bitrateLabel = t('mobile:streamDetails.bitrate', { defaultValue: 'Bitrate' });
  const codecLabel = t('mobile:streamDetails.codec', { defaultValue: 'Codec' });
  const notAvailable = t('mobile:streamDetails.notAvailable', { defaultValue: 'N/A' });
  const transcodeReasons = transcodeInfo?.reasons ?? [];
  const videoTranscodeReasons = filterTranscodeReasons(transcodeReasons, 'video');
  const audioTranscodeReasons = filterTranscodeReasons(transcodeReasons, 'audio');

  return (
    <View className="gap-2">
      {/* Container and overall bitrate */}
      {transcodeInfo?.sourceContainer || bitrate ? (
        <>
          {transcodeInfo?.sourceContainer ? (
            <ComparisonRow
              label={t('mobile:streamDetails.container', { defaultValue: 'Container' })}
              sourceValue={formatMediaTech(transcodeInfo.sourceContainer)}
              streamValue={formatMediaTech(
                transcodeInfo.streamContainer ?? transcodeInfo.sourceContainer
              )}
            />
          ) : null}
          {bitrate ? (
            <View className="flex-row items-center py-0.5">
              <Text className="text-muted-foreground w-20 text-[13px]">{bitrateLabel}</Text>
              <Text className="text-foreground text-[13px] font-medium">
                {formatBitrate(bitrate)}
              </Text>
            </View>
          ) : null}
          <View className="bg-border mt-1 h-px" />
        </>
      ) : null}

      {/* Video Section */}
      {hasVideoDetails && (
        <>
          <SectionHeader
            icon={Video}
            title={t('pages:automations.options.video')}
            badge={
              <Badge variant={getDecisionVariant(videoDecision)}>
                {decisionLabel(videoDecision)}
              </Badge>
            }
          />
          <View className="gap-0.5">
            <SectionColumnLabels />
            <ComparisonRow
              label={codecLabel}
              sourceValue={formatCodec(sourceVideoCodec)}
              streamValue={formatCodec(streamVideoCodec ?? sourceVideoCodec)}
            />
            <ComparisonRow
              label={t('common:labels.resolution')}
              sourceValue={formatResolutionDisplay(sourceVideoWidth, sourceVideoHeight)}
              streamValue={formatResolutionDisplay(
                streamVideoDetails?.width ?? sourceVideoWidth,
                streamVideoDetails?.height ?? sourceVideoHeight
              )}
            />
            <ComparisonRow
              label={bitrateLabel}
              sourceValue={formatBitrate(sourceVideoDetails?.bitrate)}
              streamValue={
                // Show N/A for Jellyfin/Emby transcodes without stream bitrate
                videoDecision === 'transcode' &&
                !streamVideoDetails?.bitrate &&
                serverType !== 'plex'
                  ? notAvailable
                  : formatBitrate(streamVideoDetails?.bitrate ?? sourceVideoDetails?.bitrate)
              }
            />
            {sourceVideoDetails?.framerate ? (
              <ComparisonRow
                label={t('mobile:streamDetails.framerate', { defaultValue: 'Framerate' })}
                sourceValue={formatFramerate(sourceVideoDetails.framerate)}
                streamValue={formatFramerate(
                  streamVideoDetails?.framerate ?? sourceVideoDetails.framerate
                )}
              />
            ) : null}
            {sourceVideoDetails?.dynamicRange ? (
              <ComparisonRow
                label={t('pages:automations.options.hdr')}
                sourceValue={formatMediaTech(sourceVideoDetails.dynamicRange)}
                streamValue={formatMediaTech(
                  streamVideoDetails?.dynamicRange ?? sourceVideoDetails.dynamicRange
                )}
              />
            ) : null}
            {sourceVideoDetails?.profile ? (
              <ComparisonRow
                label={t('mobile:streamDetails.profile', { defaultValue: 'Profile' })}
                sourceValue={sourceVideoDetails.profile}
                showArrow={false}
              />
            ) : null}
            {sourceVideoDetails?.colorSpace ? (
              <ComparisonRow
                label={t('mobile:streamDetails.color', { defaultValue: 'Color' })}
                sourceValue={`${sourceVideoDetails.colorSpace}${sourceVideoDetails.colorDepth ? ` ${sourceVideoDetails.colorDepth}bit` : ''}`}
                showArrow={false}
              />
            ) : null}
            {videoDecision === 'transcode' && videoTranscodeReasons.length > 0 && (
              <ComparisonRow
                label={t('common:labels.transcodeReason')}
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
          <View className="bg-border my-2 h-px" />
          <SectionHeader
            icon={AudioLines}
            title={t('pages:automations.options.audio')}
            badge={
              <Badge variant={getDecisionVariant(audioDecision)}>
                {decisionLabel(audioDecision)}
              </Badge>
            }
          />
          <View className="gap-0.5">
            <SectionColumnLabels />
            <ComparisonRow
              label={codecLabel}
              sourceValue={formatCodec(sourceAudioCodec)}
              streamValue={formatCodec(streamAudioCodec ?? sourceAudioCodec)}
            />
            <ComparisonRow
              label={t('mobile:streamDetails.channels', { defaultValue: 'Channels' })}
              sourceValue={formatChannels(sourceAudioChannels)}
              streamValue={formatChannels(streamAudioDetails?.channels ?? sourceAudioChannels)}
            />
            <ComparisonRow
              label={bitrateLabel}
              sourceValue={formatBitrate(sourceAudioDetails?.bitrate)}
              streamValue={
                // Show N/A for Jellyfin/Emby transcodes without stream bitrate
                audioDecision === 'transcode' &&
                !streamAudioDetails?.bitrate &&
                serverType !== 'plex'
                  ? notAvailable
                  : formatBitrate(streamAudioDetails?.bitrate ?? sourceAudioDetails?.bitrate)
              }
            />
            {sourceAudioDetails?.language ? (
              <ComparisonRow
                label={t('mobile:settings.language')}
                sourceValue={sourceAudioDetails.language}
                streamValue={streamAudioDetails?.language ?? sourceAudioDetails.language}
              />
            ) : null}
            {sourceAudioDetails?.sampleRate ? (
              <ComparisonRow
                label={t('mobile:streamDetails.sampleRate', { defaultValue: 'Sample Rate' })}
                sourceValue={`${sourceAudioDetails.sampleRate / 1000} kHz`}
                showArrow={false}
              />
            ) : null}
            {audioDecision === 'transcode' && audioTranscodeReasons.length > 0 && (
              <ComparisonRow
                label={t('common:labels.transcodeReason')}
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
          <View className="bg-border my-2 h-px" />
          <SectionHeader
            icon={Subtitles}
            title={t('mobile:streamDetails.subtitles', { defaultValue: 'Subtitles' })}
            badge={
              subtitleInfo?.decision ? (
                <Badge variant={getDecisionVariant(subtitleInfo.decision)}>
                  {decisionLabel(subtitleInfo.decision)}
                </Badge>
              ) : undefined
            }
          />
          <View className="flex-row items-center gap-2">
            <Text className="text-muted-foreground text-[13px]">
              {t('mobile:streamDetails.format', { defaultValue: 'Format:' })}
            </Text>
            <Text className="text-foreground text-[13px]">{formatCodec(subtitleInfo?.codec)}</Text>
            {subtitleInfo?.language ? (
              <>
                <Text className="text-muted-foreground text-[13px]">·</Text>
                <Text className="text-foreground text-[13px]">{subtitleInfo.language}</Text>
              </>
            ) : null}
            {subtitleInfo?.forced && (
              <Badge variant="outline">
                {t('mobile:streamDetails.forced', { defaultValue: 'Forced' })}
              </Badge>
            )}
          </View>
        </>
      )}

      {/* Transcode Details (collapsible) */}
      {hasTranscodeDetails && (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: transcodeOpen }}
            className="min-h-11 flex-row items-center justify-between py-2"
            onPress={() => setTranscodeOpen(!transcodeOpen)}
          >
            <View className="flex-row items-center gap-2">
              <Cpu size={16} color={ACCENT_COLOR} />
              <Text className="text-foreground text-sm font-medium">
                {t('mobile:streamDetails.transcodeDetails', { defaultValue: 'Transcode Details' })}
              </Text>
            </View>
            <ChevronDown
              size={16}
              color={colors.icon.default}
              style={{ transform: [{ rotate: transcodeOpen ? '180deg' : '0deg' }] }}
            />
          </Pressable>
          {transcodeOpen && (
            <View className="border-border gap-0.5 rounded-lg border p-2">
              {transcodeInfo?.hwDecoding ? (
                <View className="flex-row items-center justify-between py-0.5">
                  <Text className="text-muted-foreground text-[13px]">
                    {t('mobile:streamDetails.hwDecode', { defaultValue: 'HW Decode' })}
                  </Text>
                  <Text className="text-foreground text-[13px]">{transcodeInfo.hwDecoding}</Text>
                </View>
              ) : null}
              {transcodeInfo?.hwEncoding ? (
                <View className="flex-row items-center justify-between py-0.5">
                  <Text className="text-muted-foreground text-[13px]">
                    {t('mobile:streamDetails.hwEncode', { defaultValue: 'HW Encode' })}
                  </Text>
                  <Text className="text-foreground text-[13px]">{transcodeInfo.hwEncoding}</Text>
                </View>
              ) : null}
              {transcodeInfo?.speed !== undefined && (
                <View className="flex-row items-center justify-between py-0.5">
                  <Text className="text-muted-foreground text-[13px]">
                    {t('mobile:streamDetails.speed', { defaultValue: 'Speed' })}
                  </Text>
                  <Text
                    className={cn(
                      'text-[13px]',
                      transcodeInfo.speed < 1 ? 'text-warning' : 'text-foreground'
                    )}
                  >
                    {transcodeInfo.speed.toFixed(1)}x
                    {transcodeInfo.throttled
                      ? ` (${t('mobile:streamDetails.throttled', { defaultValue: 'throttled' })})`
                      : ''}
                  </Text>
                </View>
              )}
            </View>
          )}
        </>
      )}
    </View>
  );
}
