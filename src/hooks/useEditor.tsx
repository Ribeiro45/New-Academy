import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useEditor = () => {
  const [isEditor, setIsEditor] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkEditorStatus();
  }, []);

  const checkEditorStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setIsEditor(false);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .in('role', ['admin', 'editor'])
        .maybeSingle();

      if (error) {
        console.error('Error checking editor status:', error);
        setIsEditor(false);
      } else {
        setIsEditor(!!data);
      }
    } catch (error) {
      console.error('Error:', error);
      setIsEditor(false);
    } finally {
      setLoading(false);
    }
  };

  return { isEditor, loading };
};
