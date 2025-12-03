import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Lock, Unlock, Users } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Course {
  id: string;
  title: string;
  course_target: string;
}

interface CourseAccess {
  id: string;
  course_id: string;
  user_type: string;
}

const AdminCourseAccess = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseAccess, setCourseAccess] = useState<CourseAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [coursesRes, accessRes] = await Promise.all([
        supabase.from("courses").select("*").order("title"),
        supabase.from("course_access").select("*"),
      ]);

      if (coursesRes.error) throw coursesRes.error;
      if (accessRes.error) throw accessRes.error;

      setCourses(coursesRes.data || []);
      setCourseAccess(accessRes.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar as informações dos cursos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleAccess = async (courseId: string, userType: 'colaborador' | 'cliente') => {
    try {
      // Check if access already exists
      const existing = courseAccess.find(
        a => a.course_id === courseId && a.user_type === userType
      );

      if (existing) {
        // Remove access
        const { error } = await supabase
          .from("course_access")
          .delete()
          .eq("id", existing.id);

        if (error) throw error;

        toast({
          title: "Acesso removido",
          description: `Acesso para ${userType === 'colaborador' ? 'Colaboradores' : 'Clientes'} removido.`,
        });
      } else {
        // Add access
        const { error } = await supabase
          .from("course_access")
          .insert({ course_id: courseId, user_type: userType });

        if (error) throw error;

        toast({
          title: "Acesso concedido",
          description: `Acesso para ${userType === 'colaborador' ? 'Colaboradores' : 'Clientes'} concedido.`,
        });
      }

      fetchData();
    } catch (error) {
      console.error("Error toggling access:", error);
      toast({
        title: "Erro ao alterar acesso",
        description: "Não foi possível alterar as permissões do curso.",
        variant: "destructive",
      });
    }
  };

  const hasAccess = (courseId: string, userType: string) => {
    return courseAccess.some(
      a => a.course_id === courseId && a.user_type === userType
    );
  };

  const renderCourseTable = (userType: 'colaborador' | 'cliente') => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Curso</TableHead>
          <TableHead>Acesso Padrão</TableHead>
          <TableHead className="text-center">Status</TableHead>
          <TableHead className="text-right">Ação</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {courses.map((course) => {
          const hasSpecificAccess = hasAccess(course.id, userType);
          const defaultAccess = course.course_target === 'both' || course.course_target === userType;
          
          return (
            <TableRow key={course.id}>
              <TableCell className="font-medium">{course.title}</TableCell>
              <TableCell>
                <Badge variant={defaultAccess ? "default" : "secondary"}>
                  {defaultAccess ? "Permitido" : "Restrito"}
                </Badge>
              </TableCell>
              <TableCell className="text-center">
                {hasSpecificAccess ? (
                  <Badge variant="default" className="gap-1">
                    <Unlock className="w-3 h-3" />
                    Liberado
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1">
                    <Lock className="w-3 h-3" />
                    Bloqueado
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant={hasSpecificAccess ? "destructive" : "default"}
                  size="sm"
                  onClick={() => toggleAccess(course.id, userType)}
                >
                  {hasSpecificAccess ? "Remover Acesso" : "Liberar Acesso"}
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Gerenciamento de Acesso aos Cursos</h1>
            <p className="text-muted-foreground">
              Controle quais cursos estão disponíveis para Colaboradores e Clientes
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Controle de Acesso por Tipo de Usuário
              </CardTitle>
              <CardDescription>
                Libere ou bloqueie o acesso aos cursos para cada tipo de usuário. 
                O "Acesso Padrão" é baseado na configuração do curso.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : (
                <Tabs defaultValue="colaborador" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="colaborador">
                      Colaboradores New
                    </TabsTrigger>
                    <TabsTrigger value="cliente">
                      Clientes
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="colaborador" className="mt-4">
                    {renderCourseTable('colaborador')}
                  </TabsContent>
                  <TabsContent value="cliente" className="mt-4">
                    {renderCourseTable('cliente')}
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
  );
};

export default AdminCourseAccess;