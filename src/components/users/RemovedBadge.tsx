import { UserX } from 'lucide-react-native';
import { useTranslation } from '@tracearr/translations/mobile';
import { Badge, badgeTextVariants } from '@/components/ui/badge';
import { Text } from '@/components/ui/text';
import { colors } from '@/lib/theme';

/** Marks an account that no longer exists on its media server. */
export function RemovedBadge() {
  const { t } = useTranslation(['pages']);

  return (
    <Badge variant="danger" className="gap-1">
      <UserX size={12} color={colors.danger} />
      <Text className={badgeTextVariants({ variant: 'danger' })}>
        {t('pages:users.mergeServerAccountRemoved')}
      </Text>
    </Badge>
  );
}
