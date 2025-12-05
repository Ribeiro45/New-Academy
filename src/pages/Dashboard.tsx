import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Sidebar } from "@/components/layout/Sidebar";
import { OverallProgress } from "@/components/dashboard/OverallProgress";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Award, Download, Lightbulb, BookOpen, AlertCircle, Code, FileText } from "lucide-react";
import { User } from "@supabase/supabase-js";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import * as LucideIcons from "lucide-react";
interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string;
}
interface Certificate {
  id: string;
  certificate_number: string;
  issued_at: string;
  courses: {
    title: string;
  } | null;
}
interface Lesson {
  id: string;
  course_id: string;
  duration_minutes: number;
}
interface Progress {
  lesson_id: string;
  completed: boolean;
}
interface TopicCard {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  order_index: number;
  link_url: string;
}
const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [certificatesCount, setCertificatesCount] = useState(0);
  const [studyTime, setStudyTime] = useState(0);
  const [loading, setLoading] = useState(true);
  const [topicCards, setTopicCards] = useState<TopicCard[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  useEffect(() => {
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/");
      }
    });
    supabase.auth.getSession().then(({
      data: {
        session
      }
    }) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/");
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);
  useEffect(() => {
    if (user) {
      loadData();
    }
    loadTopicCards();
  }, [user]);
  const loadTopicCards = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from("topic_cards").select("*").order("order_index");
      if (error) throw error;
      if (data) {
        setTopicCards(data);
      }
    } catch (error) {
      console.error("Error loading topic cards:", error);
    }
  };
  const loadData = async () => {
    try {
      const [enrollmentsRes, progressRes, certificatesRes] = await Promise.all([
        supabase.from("enrollments").select("course_id").eq("user_id", user!.id),
        supabase.from("user_progress").select("*").eq("user_id", user!.id),
        supabase.from("certificates").select(`
          id,
          certificate_number,
          issued_at,
          courses (
            title
          )
        `, { count: "exact" }).eq("user_id", user!.id).order("issued_at", { ascending: false }).limit(3)
      ]);

      if (enrollmentsRes.data) {
        const courseIds = Array.from(new Set((enrollmentsRes.data as any[]).map(e => e.course_id).filter((id: string | null) => Boolean(id))));
        if (courseIds.length > 0) {
          const { data: coursesData } = await supabase.from("courses").select("*").in("id", courseIds);
          if (coursesData) {
            setCourses(coursesData as Course[]);
          }

          // Buscar TODAS as lições dos cursos matriculados (igual ao admin)
          const { data: lessonsData } = await supabase.from("lessons").select("*").in("course_id", courseIds);
          if (lessonsData) {
            setLessons(lessonsData as Lesson[]);

            // Calcular tempo de estudo com base nas aulas concluídas
            const completedLessonIds = (progressRes.data as any[] || []).filter((p: any) => p.completed).map((p: any) => p.lesson_id);
            const totalMinutes = (lessonsData as Lesson[]).filter(l => completedLessonIds.includes(l.id)).reduce((sum, l) => sum + (l.duration_minutes || 0), 0);
            setStudyTime(totalMinutes);
          } else {
            setLessons([]);
            setStudyTime(0);
          }
        } else {
          setCourses([]);
          setLessons([]);
          setStudyTime(0);
        }
      }
      setProgress(progressRes.data as any[] || []);
      if (certificatesRes.data) {
        setCertificates(certificatesRes.data as Certificate[]);
      } else {
        setCertificates([]);
      }
      setCertificatesCount(certificatesRes.count ?? certificatesRes.data?.length ?? 0);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };
  const getCourseStats = (courseId: string) => {
    const courseLessons = lessons.filter(l => l.course_id === courseId);
    const completedLessons = courseLessons.filter(l => progress.some(p => p.lesson_id === l.id && p.completed));
    const totalDuration = courseLessons.reduce((sum, l) => sum + (l.duration_minutes || 0), 0);
    const progressPercent = courseLessons.length > 0 ? completedLessons.length / courseLessons.length * 100 : 0;
    return {
      totalLessons: courseLessons.length,
      completedLessons: completedLessons.length,
      totalDuration,
      progress: progressPercent
    };
  };
  const completedLessonsCount = progress.filter(p => p.completed).length;

  // Cursos finalizados são aqueles que possuem certificado
  const completedCoursesCount = certificatesCount;
  const enrolledCoursesCount = courses.length;
  const getIconComponent = (iconName: string) => {
    const iconMap: Record<string, any> = {
      Lightbulb,
      BookOpen,
      AlertCircle,
      Code,
      FileText
    };
    return iconMap[iconName] || FileText;
  };
  return <div className="flex min-h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="animate-fade-in">
            <h1 className="text-4xl font-bold mb-2">Dashboard</h1>
            <p className="text-muted-foreground">Continue seu aprendizado de onde parou</p>
          </div>

          {/* Barra de pesquisa */}
          <div className="relative max-w-2xl mx-auto">
            
            
          </div>

          {loading ? <Skeleton className="h-48 w-full" /> : <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Cursos Inscritos
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-primary">{enrolledCoursesCount}</div>
                    <p className="text-xs text-muted-foreground mt-1">Total de cursos que você está fazendo</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Cursos Finalizados
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-primary">{completedCoursesCount}</div>
                    <p className="text-xs text-muted-foreground mt-1">Cursos concluídos com 100%</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Taxa de Conclusão
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-primary">
                      {enrolledCoursesCount > 0 ? Math.round(completedCoursesCount / enrolledCoursesCount * 100) : 0}%
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Percentual de cursos finalizados</p>
                  </CardContent>
                </Card>
              </div>

              <OverallProgress totalCourses={courses.length} completedCourses={completedCoursesCount} totalLessons={lessons.length} completedLessons={completedLessonsCount} certificates={certificatesCount} studyTime={studyTime} />
            </>}

          {certificates.length > 0 && <div className="animate-fade-in">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <Award className="w-6 h-6 text-primary" />
                  Certificados Recentes
                </h2>
                <Button variant="outline" onClick={() => navigate("/certificates")}>
                  Ver todos
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {certificates.map((cert, index) => <Card key={cert.id} className="overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer" onClick={() => navigate("/certificates")} style={{
              animationDelay: `${index * 100}ms`
            }}>
                    <div className="h-2 bg-gradient-to-r from-primary to-accent" />
                    <CardHeader className="pb-3">
                      <div className="flex gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-accent/20 rounded-xl flex items-center justify-center flex-shrink-0">
                          <Award className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base line-clamp-2">
                            {cert.courses?.title || "Curso"}
                          </CardTitle>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(cert.issued_at), "dd/MM/yyyy", {
                        locale: ptBR
                      })}
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground">
                        Certificado Nº {cert.certificate_number}
                      </p>
                    </CardContent>
                  </Card>)}
              </div>
            </div>}

          {/* Navegação por Tópicos */}
          {topicCards.length > 0 && <div className="space-y-4">
              <h2 className="text-2xl font-bold">Navegação por Tópicos</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {topicCards.map(card => {
              const IconComponent = getIconComponent(card.icon);
              return <Card key={card.id} className="cursor-pointer hover:shadow-lg transition-all duration-300 group" onClick={() => navigate(card.link_url)}>
                      <CardContent className="p-6 space-y-4">
                        <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center">
                          <IconComponent className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg mb-1">{card.title}</h3>
                          {card.description && <p className="text-sm text-muted-foreground">{card.description}</p>}
                        </div>
                      </CardContent>
                    </Card>;
            })}
              </div>
            </div>}

        </div>
      </main>
    </div>;
};
export default Dashboard;