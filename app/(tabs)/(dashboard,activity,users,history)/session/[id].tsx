import { useLocalSearchParams, useRouter } from 'expo-router';
import { useNoTransitionWhileHidden } from '@/hooks/useSplitSelection';
import { useRouteMem } from '@/hooks/useScrollMemory';
import { SessionDetail } from '@/screens/SessionDetail';

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  useNoTransitionWhileHidden();
  const mem = useRouteMem();
  return <SessionDetail id={id} mem={mem} onBack={() => router.back()} />;
}
