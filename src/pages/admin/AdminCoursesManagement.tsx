import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AdminCourses from './AdminCourses';
import AdminQuizzes from './AdminQuizzes';

export default function AdminCoursesManagement() {
  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Gerenciamento de Cursos</h1>
        
        <Tabs defaultValue="courses" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
            <TabsTrigger value="courses">Cursos e Aulas</TabsTrigger>
            <TabsTrigger value="quizzes">Provas e Questões</TabsTrigger>
          </TabsList>
          
          <TabsContent value="courses" className="mt-0">
            <AdminCourses />
          </TabsContent>
          
          <TabsContent value="quizzes" className="mt-0">
            <AdminQuizzes />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
