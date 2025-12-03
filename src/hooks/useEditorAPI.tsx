import { useAuth } from '@/contexts/AuthContext';

export const useEditorAPI = () => {
  const { isEditor, loading } = useAuth();
  return { isEditor, loading };
};
