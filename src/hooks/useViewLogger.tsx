import { supabase } from '@/integrations/supabase/client';

export const useViewLogger = () => {
  const logAction = async (
    action: 'VIEW' | 'INSERT' | 'UPDATE' | 'DELETE',
    tableName: 'courses' | 'faqs' | 'faq_notes',
    recordId: string,
    description: string,
    oldData?: any,
    newData?: any
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('activity_logs').insert({
        user_id: user.id,
        action,
        table_name: tableName,
        record_id: recordId,
        description,
        old_data: oldData || null,
        new_data: newData || { logged_at: new Date().toISOString() }
      });
    } catch (error) {
      console.error('Error logging action:', error);
    }
  };

  const logView = async (
    tableName: 'courses' | 'faqs' | 'faq_notes',
    recordId: string,
    recordTitle: string
  ) => {
    let description = '';
    let action: 'VIEW' | 'INSERT' = 'VIEW';
    
    if (tableName === 'courses') {
      description = `Visualizou o curso: ${recordTitle}`;
    } else if (tableName === 'faqs') {
      description = `Visualizou documento: ${recordTitle}`;
    } else if (tableName === 'faq_notes') {
      description = recordTitle;
      action = 'INSERT';
    }

    await logAction(action, tableName, recordId, description, null, { title: recordTitle, logged_at: new Date().toISOString() });
  };

  return { logView, logAction };
};
