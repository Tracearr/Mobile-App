import { useLocalSearchParams, useRouter } from 'expo-router';
import { useNoTransitionWhileHidden } from '@/hooks/useSplitSelection';
import { useRouteMem } from '@/hooks/useScrollMemory';
import { UserDetail } from '@/screens/UserDetail';

export default function UserDetailScreen() {
  const { id, tab } = useLocalSearchParams<{ id: string; tab?: string }>();
  const router = useRouter();
  useNoTransitionWhileHidden();
  const mem = useRouteMem();
  return <UserDetail id={id} mem={mem} tab={tab} onBack={() => router.back()} />;
}
