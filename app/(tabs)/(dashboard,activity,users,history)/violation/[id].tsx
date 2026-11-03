import { useLocalSearchParams, useRouter } from 'expo-router';
import { useNoTransitionWhileHidden } from '@/hooks/useSplitSelection';
import { useRouteMem } from '@/hooks/useScrollMemory';
import { ViolationDetail } from '@/screens/ViolationDetail';

export default function ViolationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  useNoTransitionWhileHidden();
  const mem = useRouteMem();
  return <ViolationDetail id={id} mem={mem} onBack={() => router.back()} />;
}
