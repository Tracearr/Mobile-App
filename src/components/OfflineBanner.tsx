/**
 * Offline banner component
 * Shows persistent warning banner when disconnected from server
 * with a manual retry button
 */
import { WifiOff } from 'lucide-react-native';
import { useShallow } from 'zustand/react/shallow';
import { useTranslation } from '@tracearr/translations/mobile';
import { Banner } from '@/components/ui/banner';
import { useAuthStateStore } from '../lib/authStateStore';

interface OfflineBannerProps {
  onRetry: () => void;
}

export function OfflineBanner({ onRetry }: OfflineBannerProps) {
  const { t } = useTranslation(['mobile', 'common']);
  const { connectionState, server, tokenStatus } = useAuthStateStore(
    useShallow((s) => ({
      connectionState: s.connectionState,
      server: s.server,
      tokenStatus: s.tokenStatus,
    }))
  );

  // Only show offline banner if user is authenticated (has paired server)
  // and connection is lost. Don't show on fresh install or during pairing.
  const isAuthenticated = server !== null && tokenStatus !== 'revoked';

  if (connectionState !== 'disconnected' || !isAuthenticated) return null;

  return (
    <Banner
      tone="warning"
      icon={WifiOff}
      message={t('mobile:errors.connectionLost')}
      action={{ label: t('common:actions.retry'), onPress: onRetry }}
    />
  );
}
