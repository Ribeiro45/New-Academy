import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Lock, Unlock, Users, BookOpen, Folder, Check } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";

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

interface FaqSection {
  id: string;
  title: string;
  target_audience: string;
}

interface Group {
  id: string;
  name: string;
}

interface FaqSectionAccess {
  id: string;
  faq_section_id: string;
  group_id: string;
}

const AdminCourseAccess = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseAccess, setCourseAccess] = useState<CourseAccess[]>([]);
  const [faqSections, setFaqSections] = useState<FaqSection[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [faqSectionAccess, setFaqSectionAccess] = useState<FaqSectionAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [coursesRes, accessRes, faqSectionsRes, groupsRes, faqAccessRes] = await Promise.all([
        supabase.from("courses").select("*").order("title"),
        supabase.from("course_access").select("*"),
        supabase.from("faqs").select("*").eq("is_section", true).order("order_index"),
        supabase.from("groups").select("*").order("name"),
        supabase.from("faq_section_access").select("*"),
      ]);

      if (coursesRes.error) throw coursesRes.error;
      if (accessRes.error) throw accessRes.error;
      if (faqSectionsRes.error) throw faqSectionsRes.error;
      if (groupsRes.error) throw groupsRes.error;
      if (faqAccessRes.error) throw faqAccessRes.error;

      setCourses(coursesRes.data || []);
      setCourseAccess(accessRes.data || []);
      setFaqSections(faqSectionsRes.data || []);
      setGroups(groupsRes.data || []);
      setFaqSectionAccess(faqAccessRes.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar as informações.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleAccess = async (courseId: string, userType: 'colaborador' | 'cliente') => {
    try {
      const existing = courseAccess.find(
        a => a.course_id === courseId && a.user_type === userType
      );

      if (existing) {
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

  const toggleFaqSectionAccess = async (sectionId: string, groupId: string) => {
    try {
      const existing = faqSectionAccess.find(
        a => a.faq_section_id === sectionId && a.group_id === groupId
      );

      if (existing) {
        const { error } = await supabase
          .from("faq_section_access")
          .delete()
          .eq("id", existing.id);

        if (error) throw error;

        toast({
          title: "Acesso removido",
          description: "Acesso à seção removido para o grupo.",
        });
      } else {
        const { error } = await supabase
          .from("faq_section_access")
          .insert({ faq_section_id: sectionId, group_id: groupId });

        if (error) throw error;

        toast({
          title: "Acesso concedido",
          description: "Acesso à seção concedido para o grupo.",
        });
      }

      fetchData();
    } catch (error) {
      console.error("Error toggling FAQ section access:", error);
      toast({
        title: "Erro ao alterar acesso",
        description: "Não foi possível alterar as permissões da seção.",
        variant: "destructive",
      });
    }
  };

  const hasAccess = (courseId: string, userType: string) => {
    return courseAccess.some(
      a => a.course_id === courseId && a.user_type === userType
    );
  };

  const hasFaqSectionAccess = (sectionId: string, groupId: string) => {
    return faqSectionAccess.some(
      a => a.faq_section_id === sectionId && a.group_id === groupId
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

  const renderFaqAccessTable = () => (
    <div className="space-y-4">
      {groups.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Nenhum grupo cadastrado.</p>
          <p className="text-sm">Crie grupos primeiro para gerenciar o acesso à base de conhecimento.</p>
        </div>
      ) : faqSections.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Folder className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Nenhuma seção de FAQ cadastrada.</p>
          <p className="text-sm">Crie seções na base de conhecimento para gerenciar o acesso.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Seção</TableHead>
              {groups.map(group => (
                <TableHead key={group.id} className="text-center min-w-[120px]">
                  {group.name}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {faqSections.map((section) => (
              <TableRow key={section.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <Folder className="w-4 h-4 text-muted-foreground" />
                    {section.title}
                  </div>
                </TableCell>
                {groups.map(group => {
                  const hasGroupAccess = hasFaqSectionAccess(section.id, group.id);
                  return (
                    <TableCell key={group.id} className="text-center">
                      <div className="flex justify-center">
                        <Checkbox
                          checked={hasGroupAccess}
                          onCheckedChange={() => toggleFaqSectionAccess(section.id, group.id)}
                          className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        />
                      </div>
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <div className="text-sm text-muted-foreground bg-muted/50 p-4 rounded-lg">
        <p><strong>Nota:</strong> Usuários que não pertencem a nenhum grupo terão acesso a todas as seções.</p>
        <p>Marque as caixas para liberar o acesso de cada grupo às seções da base de conhecimento.</p>
      </div>
    </div>
  );

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Gerenciamento de Acessos</h1>
          <p className="text-muted-foreground">
            Controle o acesso aos cursos e à base de conhecimento
          </p>
        </div>

        <Tabs defaultValue="courses" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="courses" className="gap-2">
              <BookOpen className="w-4 h-4" />
              Cursos
            </TabsTrigger>
            <TabsTrigger value="knowledge-base" className="gap-2">
              <Folder className="w-4 h-4" />
              Base de Conhecimento
            </TabsTrigger>
          </TabsList>

          <TabsContent value="courses">
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
          </TabsContent>

          <TabsContent value="knowledge-base">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Folder className="w-5 h-5" />
                  Acesso por Grupo à Base de Conhecimento
                </CardTitle>
                <CardDescription>
                  Defina quais grupos têm acesso a cada seção da base de conhecimento.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center p-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  </div>
                ) : (
                  renderFaqAccessTable()
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminCourseAccess;