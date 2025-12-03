import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Sidebar } from '@/components/layout/Sidebar';

interface LeaderRouteProps {
  children: React.ReactNode;
}

export const LeaderRoute = ({ children }: LeaderRouteProps) => {
  const [isLeader, setIsLeader] = useState<boolean | null>(null);
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

  if (loading) {
    return <div>Carregando...</div>;
  }

  if (!isLeader) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
};
