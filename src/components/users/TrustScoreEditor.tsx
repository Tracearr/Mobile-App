import { useState } from 'react';
import { View, Alert } from 'react-native';
import Slider from '@expo/ui/community/slider';
import { Minus, Plus } from 'lucide-react-native';
import { useTranslation } from '@tracearr/translations/mobile';
import { useUpdateTrustScore } from '@/hooks';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { haptics } from '@/lib/haptics';
import { ACCENT_COLOR, colors } from '@/lib/theme';
import { cn } from '@/lib/utils';
import { TrustScoreBadge } from './TrustScoreBadge';

const MIN_SCORE = 0;
const MAX_SCORE = 100;

const clampScore = (value: number) => Math.min(MAX_SCORE, Math.max(MIN_SCORE, Math.round(value)));

export interface TrustEditTarget {
  /** Which control opened the editor; the same account can be reachable from both. */
  origin: 'header' | 'linkedAccount';
  id: string;
  username: string;
  score: number;
}

interface TrustScoreEditorProps {
  target: TrustEditTarget;
  onClose: () => void;
}

/** Inline editor for one account's trust score. Mount it with `key={target.id}`. */
export function TrustScoreEditor({ target, onClose }: TrustScoreEditorProps) {
  const { t } = useTranslation(['pages', 'common', 'mobile']);
  const [score, setScore] = useState(target.score);
  const update = useUpdateTrustScore();
  const canSave = !update.isPending && score !== target.score;
  const canDecrease = !update.isPending && score > MIN_SCORE;
  const canIncrease = !update.isPending && score < MAX_SCORE;

  const save = () => {
    update.mutate(
      { id: target.id, trustScore: score },
      {
        onSuccess: () => {
          haptics.success();
          onClose();
        },
        onError: (error) => {
          haptics.error();
          Alert.alert(t('common:errors.somethingWentWrong'), error.message);
        },
      }
    );
  };

  const confirmSave = () => {
    Alert.alert(
      t('pages:userDetail.adjustTrustScore'),
      t('mobile:userDetail.trustScoreConfirm', {
        username: target.username,
        score,
        defaultValue: 'Set the trust score for @{{username}} to {{score}}?',
      }),
      [
        { text: t('common:actions.cancel'), style: 'cancel' },
        { text: t('common:actions.save'), onPress: save },
      ]
    );
  };

  return (
    <View className="border-border mt-3 gap-3 border-t pt-3">
      <View className="flex-row items-center justify-between gap-2">
        <Text className="text-muted-foreground flex-1 text-xs">
          {t('mobile:userDetail.trustScoreRange', {
            username: target.username,
            defaultValue: 'Trust score for @{{username}}, from 0 to 100.',
          })}
        </Text>
        <TrustScoreBadge score={score} showLabel />
      </View>

      <View className="flex-row items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className={cn('min-h-11 min-w-11', !canDecrease && 'opacity-50')}
          disabled={!canDecrease}
          onPress={() => setScore((current) => clampScore(current - 1))}
          accessibilityLabel={t('mobile:a11y.decreaseTrustScore', {
            defaultValue: 'Decrease trust score',
          })}
        >
          <Minus size={16} color={colors.text.primary.dark} />
        </Button>
        <Slider
          style={{ flex: 1 }}
          value={score}
          minimumValue={MIN_SCORE}
          maximumValue={MAX_SCORE}
          disabled={update.isPending}
          minimumTrackTintColor={ACCENT_COLOR}
          thumbTintColor={ACCENT_COLOR}
          onValueChange={(value) => setScore(clampScore(value))}
        />
        <Button
          variant="outline"
          size="icon"
          className={cn('min-h-11 min-w-11', !canIncrease && 'opacity-50')}
          disabled={!canIncrease}
          onPress={() => setScore((current) => clampScore(current + 1))}
          accessibilityLabel={t('mobile:a11y.increaseTrustScore', {
            defaultValue: 'Increase trust score',
          })}
        >
          <Plus size={16} color={colors.text.primary.dark} />
        </Button>
      </View>

      <View className="flex-row justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          className="min-h-11"
          disabled={update.isPending}
          onPress={onClose}
        >
          {t('common:actions.cancel')}
        </Button>
        <Button
          size="sm"
          className={cn('min-h-11', !canSave && 'opacity-50')}
          disabled={!canSave}
          onPress={confirmSave}
        >
          {update.isPending ? t('common:states.saving') : t('common:actions.save')}
        </Button>
      </View>
    </View>
  );
}
