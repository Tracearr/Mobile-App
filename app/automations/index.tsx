import { useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Workflow } from 'lucide-react-native';
import { useTranslation } from '@tracearr/translations/mobile';
import { SERVER_2_2, useServerVersion } from '@/hooks';
import { AutomationsList } from '@/components/automations/AutomationsList';
import { RunsFeed } from '@/components/automations/RunsFeed';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { ScreenHeader } from '@/components/ui/screen-header';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { useResponsive } from '@/hooks/useResponsive';
import { useRouter } from 'expo-router';
import { useReturnToTabs } from '@/hooks/useOpenInTabs';
import { haptics } from '@/lib/haptics';
import { ACCENT_COLOR, colors, layout, spacing } from '@/lib/theme';

type Segment = 'automations' | 'activity';

export default function AutomationsScreen() {
  const { t } = useTranslation(['pages', 'mobile', 'common']);
  const router = useRouter();
  const returnToTabs = useReturnToTabs();
  const { horizontalPadding } = useResponsive();
  const { version, supports, isError, refetch } = useServerVersion();
  const [segment, setSegment] = useState<Segment>('automations');

  const handleSegmentChange = (next: Segment) => {
    haptics.selection();
    setSegment(next);
  };

  let body;
  if (supports(SERVER_2_2)) {
    body = (
      <>
        <View style={{ paddingHorizontal: horizontalPadding, paddingTop: spacing.sm }}>
          <View
            style={{ width: '100%', maxWidth: layout.secondaryMaxWidth, alignSelf: 'flex-start' }}
          >
            <SegmentedControl
              options={[
                { value: 'automations', label: t('pages:automations.title') },
                { value: 'activity', label: t('pages:automations.activity.title') },
              ]}
              value={segment}
              onChange={handleSegmentChange}
            />
          </View>
        </View>
        {segment === 'automations' ? (
          <AutomationsList horizontalPadding={horizontalPadding} />
        ) : (
          <RunsFeed horizontalPadding={horizontalPadding} />
        )}
      </>
    );
  } else if (version !== null) {
    body = (
      <EmptyState
        className="flex-1 justify-center"
        icon={Workflow}
        title={t('mobile:automations.unsupportedTitle', {
          defaultValue: 'Automations need server 2.2 or newer',
        })}
        description={t('mobile:automations.unsupportedDescription', {
          version,
          defaultValue:
            'This server reports version {{version}}. Update Tracearr to see automations and what they ran.',
        })}
      />
    );
  } else if (isError) {
    body = (
      <ErrorState
        className="flex-1 justify-center"
        title={t('mobile:automations.versionCheckFailed', {
          defaultValue: 'Could not check the server version',
        })}
        onRetry={() => void refetch()}
      />
    );
  } else {
    body = (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color={ACCENT_COLOR} />
      </View>
    );
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background.dark }}
      edges={['left', 'right', 'bottom']}
    >
      <ScreenHeader
        title={t('pages:automations.title')}
        onBack={router.canGoBack() ? undefined : returnToTabs}
      />
      {body}
    </SafeAreaView>
  );
}
