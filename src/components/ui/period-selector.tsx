import React from 'react';
import { useTranslation } from '@tracearr/translations/mobile';
import { SegmentedControl } from './segmented-control';

export type StatsPeriod = 'week' | 'month' | 'year';

interface PeriodSelectorProps {
  value: StatsPeriod;
  onChange: (value: StatsPeriod) => void;
}

export function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  const { t } = useTranslation(['common']);

  return (
    <SegmentedControl
      fullWidth={false}
      value={value}
      onChange={onChange}
      options={[
        {
          value: 'week',
          label: t('common:periods.short7Days', { defaultValue: '7d' }),
          accessibilityLabel: t('common:periods.last7Days'),
        },
        {
          value: 'month',
          label: t('common:periods.short30Days', { defaultValue: '30d' }),
          accessibilityLabel: t('common:periods.last30Days'),
        },
        {
          value: 'year',
          label: t('common:periods.shortYear', { defaultValue: '1y' }),
          accessibilityLabel: t('common:periods.lastYear'),
        },
      ]}
    />
  );
}
