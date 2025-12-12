import { supabase } from '@/integrations/supabase/client';

export const useViewLogger = () => {
  const logView = async (
    tableName: 'courses' | 'faqs',
    recordId: string,
    recordTitle: string
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const description = tableName === 'courses' 
        ? `Visualizou o curso: ${recordTitle}`
        : `Visualizou documento: ${recordTitle}`;

      await supabase.from('activity_logs').insert({
        user_id: user.id,
        action: 'VIEW',
        table_name: tableName,
        record_id: recordId,
        description,
        new_data: { title: recordTitle, viewed_at: new Date().toISOString() }
      });
    } catch (error) {
      console.error('Error logging view:', error);
    }
  };

  return { logView };
};
