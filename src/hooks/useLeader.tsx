import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useLeader = () => {
  const [isLeader, setIsLeader] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkLeaderStatus();
  }, []);

  const checkLeaderStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setIsLeader(false);
        setLoading(false);
        return;
      }

      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      const hasLeaderRole = roles?.some(r => r.role === 'lider');
      setIsLeader(hasLeaderRole || false);
      setLoading(false);
    } catch (error) {
      console.error('Error checking leader status:', error);
      setIsLeader(false);
      setLoading(false);
    }
  };

  return { isLeader, loading };
};
