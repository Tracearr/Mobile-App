import * as React from 'react';
import { CircleAlert } from 'lucide-react-native';
import { useTranslation } from '@tracearr/translations/mobile';
import { EmptyState } from './empty-state';

export interface ErrorStateProps {
  onRetry: () => void;
  /** Defaults to common:errors.somethingWentWrong. */
  title?: string;
  /** Usually `error.message`. */
  message?: string;
  compact?: boolean;
  className?: string;
}

export function ErrorState({ onRetry, title, message, compact, className }: ErrorStateProps) {
  const { t } = useTranslation(['common']);

  return (
    <EmptyState
      icon={CircleAlert}
      tone="danger"
      title={title ?? t('common:errors.somethingWentWrong')}
      description={message}
      action={{ label: t('common:actions.retry'), onPress: onRetry }}
      compact={compact}
      className={className}
    />
  );
}
