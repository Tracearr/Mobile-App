import { useLocalSearchParams, useRouter } from 'expo-router';
import { UserDetail } from '@/screens/UserDetail';

export default function UserDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  return <UserDetail id={id} onBack={() => router.back()} />;
}
