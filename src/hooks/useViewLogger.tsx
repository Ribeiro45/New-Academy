import { supabase } from '@/integrations/supabase/client';

export const useViewLogger = () => {
  const logView = async (
    tableName: 'courses' | 'faqs' | 'faq_notes',
    recordId: string,
    recordTitle: string
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let description = '';
      if (tableName === 'courses') {
        description = `Visualizou o curso: ${recordTitle}`;
      } else if (tableName === 'faqs') {
        description = `Visualizou documento: ${recordTitle}`;
      } else if (tableName === 'faq_notes') {
        description = recordTitle; // Custom description for notes
      }

      await supabase.from('activity_logs').insert({
        user_id: user.id,
        action: tableName === 'faq_notes' ? 'INSERT' : 'VIEW',
        table_name: tableName,
        record_id: recordId,
        description,
        new_data: { title: recordTitle, logged_at: new Date().toISOString() }
      });
    } catch (error) {
      console.error('Error logging view:', error);
    }
  };

  return { logView };
};
