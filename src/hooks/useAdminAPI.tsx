import { useAuth } from '@/contexts/AuthContext';

export const useAdminAPI = () => {
  const { isAdmin, loading } = useAuth();
  return { isAdmin, loading };
};
