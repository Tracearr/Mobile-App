import { Badge } from '@/components/ui/badge';

export function SeverityBadge({ severity }: { severity: string }) {
  const variant = severity === 'high' ? 'destructive' : severity === 'warning' ? 'warning' : 'default';

  return (
    <Badge variant={variant} className="capitalize">
      {severity}
    </Badge>
  );
}
