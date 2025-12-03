import { useAuth } from '@/contexts/AuthContext';

export const useLeaderAPI = () => {
  const { isLeader, loading } = useAuth();
  return { isLeader, loading };
};
