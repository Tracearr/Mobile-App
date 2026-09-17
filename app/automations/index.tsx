import { useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useIsFetching, useQueryClient } from '@tanstack/react-query';
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
import { haptics } from '@/lib/haptics';
import { queryKeys } from '@/lib/queryKeys';
import { ROUTES } from '@/lib/routes';
import { ACCENT_COLOR, colors, spacing } from '@/lib/theme';

type Segment = 'automations' | 'activity';

export default function AutomationsScreen() {
  const { t } = useTranslation(['pages', 'mobile', 'common']);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { select } = useResponsive();
  const { version, supports } = useServerVersion();
  const versionFetching = useIsFetching({ queryKey: queryKeys.versionPrefix() }) > 0;
  const [segment, setSegment] = useState<Segment>('automations');

  const horizontalPadding = select({ base: spacing.md, md: spacing.lg, lg: spacing.xl });

  const handleSegmentChange = (next: Segment) => {
    haptics.selection();
    setSegment(next);
  };

  let body;
  if (supports(SERVER_2_2)) {
    body = (
      <>
        <View style={{ paddingHorizontal: horizontalPadding, paddingTop: spacing.sm }}>
          <SegmentedControl
            options={[
              { value: 'automations', label: t('pages:automations.title') },
              { value: 'activity', label: t('pages:automations.activity.title') },
            ]}
            value={segment}
            onChange={handleSegmentChange}
          />
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
  } else if (versionFetching) {
    body = (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color={ACCENT_COLOR} />
      </View>
    );
  } else {
    body = (
      <ErrorState
        className="flex-1 justify-center"
        title={t('mobile:automations.versionCheckFailed', {
          defaultValue: 'Could not check the server version',
        })}
        onRetry={() => void queryClient.refetchQueries({ queryKey: queryKeys.versionPrefix() })}
      />
    );
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background.dark }}
      edges={['left', 'right', 'bottom']}
    >
      <ScreenHeader
        title={t('pages:automations.title')}
        onBack={router.canGoBack() ? undefined : () => router.replace(ROUTES.TABS)}
      />
      {body}
    </SafeAreaView>
  );
}
