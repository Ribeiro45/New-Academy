import { Navigate } from 'react-router-dom';
import { useEditor } from '@/hooks/useEditor';
import { Sidebar } from '@/components/layout/Sidebar';

export const EditorRoute = ({ children }: { children: React.ReactNode }) => {
  const { isEditor, loading } = useEditor();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isEditor) {
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
