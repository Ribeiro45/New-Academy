import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Sidebar } from "@/components/layout/Sidebar";
import { VideoPlayer } from "@/components/course/VideoPlayer";
import { QuizTaker } from "@/components/quiz/QuizTaker";
import { ModuleQuizTaker } from "@/components/course/ModuleQuizTaker";
import { FinalExamTaker } from "@/components/quiz/FinalExamTaker";
import { ModuleAccordion } from "@/components/course/ModuleAccordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CheckCircle2, Circle, ArrowLeft, ChevronDown, Clock, BookOpen, GraduationCap, Award } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { User } from "@supabase/supabase-js";
import { CertificatePreview } from "@/components/certificates/CertificatePreview";
import { useViewLogger } from "@/hooks/useViewLogger";

interface Lesson {
  id: string;
  title: string;
  youtube_url: string;
  order_index: number;
  duration_minutes: number;
  module_id: string | null;
  hasQuiz?: boolean;
  quizId?: string | null;
}

interface Module {
  id: string;
  title: string;
  description: string;
  order_index: number;
  lessons: Lesson[];
  hasQuiz: boolean;
}

interface CourseData {
  title: string;
  description: string;
  duration: string | null;
  total_modules: number | null;
  total_lessons: number | null;
}

const formatDuration = (duration: string): string => {
  const hoursMatch = duration.match(/(\d+(?:\.\d+)?)\s*h/i);
  const minutesMatch = duration.match(/(\d+)\s*min/i);
  
  let totalMinutes = 0;
  
  if (hoursMatch) {
    totalMinutes += parseFloat(hoursMatch[1]) * 60;
  }
  if (minutesMatch) {
    totalMinutes += parseInt(minutesMatch[1]);
  }
  
  if (!hoursMatch && !minutesMatch) {
    const numMatch = duration.match(/(\d+(?:\.\d+)?)/);
    if (numMatch) {
      totalMinutes = parseFloat(numMatch[1]) * 60;
    } else {
      return duration;
    }
  }
  
  if (totalMinutes >= 60) {
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    if (mins > 0) {
      return `${hours} ${hours === 1 ? 'hora' : 'horas'} e ${mins} ${mins === 1 ? 'minuto' : 'minutos'}`;
    }
    return `${hours} ${hours === 1 ? 'hora' : 'horas'}`;
  } else {
    return `${totalMinutes} ${totalMinutes === 1 ? 'minuto' : 'minutos'}`;
  }
};

const Course = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { logView } = useViewLogger();
  const [user, setUser] = useState<User | null>(null);
  const [course, setCourse] = useState<CourseData | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [currentModuleQuiz, setCurrentModuleQuiz] = useState<string | null>(null);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  const [passedQuizzes, setPassedQuizzes] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'lesson' | 'module-quiz' | 'final-exam'>('lesson');
  const [loading, setLoading] = useState(true);
  const [infoOpen, setInfoOpen] = useState(false);
  const [hasCertificate, setHasCertificate] = useState(false);
  const [certificateData, setCertificateData] = useState<{ certificate_number: string; issued_at: string } | null>(null);
  const [profile, setProfile] = useState<{ full_name: string; cpf: string } | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [generatingCertificate, setGeneratingCertificate] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (!session) navigate("/");
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session) navigate("/");
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user && id) {
      loadCourse();
    }
  }, [user, id]);

  const loadCourse = async () => {
    try {
      // First fetch lessons to get their IDs for filtering progress
      const [courseRes, modulesRes, lessonsRes, moduleQuizzesRes, lessonQuizzesRes, certificateRes, profileRes] = await Promise.all([
        supabase.from("courses").select("*").eq("id", id).single(),
        supabase.from("modules").select("*").eq("course_id", id).order("order_index"),
        supabase.from("lessons").select("*").eq("course_id", id).order("order_index"),
        supabase.from("quizzes").select("id, module_id").eq("course_id", id).not("module_id", "is", null),
        supabase.from("quizzes").select("id, lesson_id").eq("course_id", id).not("lesson_id", "is", null),
        supabase.from("certificates").select("certificate_number, issued_at").eq("user_id", user?.id).eq("course_id", id).maybeSingle(),
        supabase.from("profiles").select("full_name, cpf").eq("id", user?.id).maybeSingle(),
      ]);

      // Get lesson IDs from this course to filter progress correctly
      const lessonIds = lessonsRes.data?.map(l => l.id) || [];
      
      // Fetch progress only for lessons in this course
      const progressRes = lessonIds.length > 0
        ? await supabase.from("user_progress").select("*").eq("user_id", user?.id).in("lesson_id", lessonIds)
        : { data: [] };

      if (courseRes.data) {
        setCourse(courseRes.data);
        // Log view every time the course is accessed
        logView('courses', id!, courseRes.data.title);
      }
      if (certificateRes.data) {
        setHasCertificate(true);
        setCertificateData(certificateRes.data);
      }
      if (profileRes.data) setProfile(profileRes.data);
      
      if (lessonsRes.data) {
        setLessons(lessonsRes.data);
      }

      if (modulesRes.data && lessonsRes.data) {
        // Check which modules have quizzes
        const moduleQuizMap = new Map(
          moduleQuizzesRes.data?.map(q => [q.module_id, true]) || []
        );
        
        // Check which lessons have quizzes
        const lessonQuizMap = new Map(
          lessonQuizzesRes.data?.map(q => [q.lesson_id, q.id]) || []
        );

        if (modulesRes.data.length > 0) {
          // Organize lessons by module and attach quiz info
          const modulesWithLessons = modulesRes.data.map(module => ({
            ...module,
            lessons: lessonsRes.data
              .filter(l => l.module_id === module.id)
              .sort((a, b) => a.order_index - b.order_index)
              .map(lesson => ({
                ...lesson,
                hasQuiz: lessonQuizMap.has(lesson.id),
                quizId: lessonQuizMap.get(lesson.id) || null,
              })),
            hasQuiz: moduleQuizMap.has(module.id),
          }));

          setModules(modulesWithLessons);

          // Get completed lesson IDs from progress
          const completedLessonIds = new Set(
            progressRes.data?.filter(p => p.completed).map(p => p.lesson_id) || []
          );

          // Find the first uncompleted lesson to resume from
          let resumeLesson: Lesson | null = null;
          for (const module of modulesWithLessons) {
            for (const lesson of module.lessons) {
              if (!completedLessonIds.has(lesson.id)) {
                resumeLesson = lesson;
                break;
              }
            }
            if (resumeLesson) break;
          }

          // If all lessons completed, show the last lesson; otherwise show first uncompleted
          if (resumeLesson) {
            setCurrentLesson(resumeLesson);
          } else if (modulesWithLessons[0]?.lessons.length > 0) {
            // All completed - show last lesson of last module
            const lastModule = modulesWithLessons[modulesWithLessons.length - 1];
            setCurrentLesson(lastModule.lessons[lastModule.lessons.length - 1]);
          }
        } else {
          // Fallback: Create a default module with all lessons if no modules exist
          const allLessons = lessonsRes.data.sort((a, b) => a.order_index - b.order_index);
          const defaultModule = {
            id: 'default',
            title: 'Aulas',
            description: '',
            order_index: 0,
            lessons: allLessons,
            hasQuiz: false,
          };
          
          setModules([defaultModule]);
          
          // Find first uncompleted lesson
          const completedLessonIds = new Set(
            progressRes.data?.filter(p => p.completed).map(p => p.lesson_id) || []
          );
          const resumeLesson = allLessons.find(l => !completedLessonIds.has(l.id));
          
          if (resumeLesson) {
            setCurrentLesson(resumeLesson);
          } else if (allLessons.length > 0) {
            setCurrentLesson(allLessons[allLessons.length - 1]);
          }
        }
      }

      if (progressRes.data) {
        const completed = new Set(
          progressRes.data.filter(p => p.completed).map(p => p.lesson_id)
        );
        setCompletedLessons(completed);
      }

      // Fetch passed quizzes
      const { data: passedQuizzesData } = await supabase
        .from('user_quiz_attempts')
        .select('quiz_id')
        .eq('user_id', user?.id)
        .eq('passed', true);

      if (passedQuizzesData) {
        setPassedQuizzes(new Set(passedQuizzesData.map(q => q.quiz_id)));
      }
    } catch (error) {
      console.error("Error loading course:", error);
      toast.error("Erro ao carregar curso");
    } finally {
      setLoading(false);
    }
  };

  const isCourseComplete = lessons.length > 0 && completedLessons.size === lessons.length;

  const toggleLessonComplete = async (lessonId: string) => {
    const isCompleted = completedLessons.has(lessonId);
    
    // Prevent unmarking lessons that are already completed
    if (isCompleted) {
      return;
    }
    
    try {
      await supabase
        .from("user_progress")
        .upsert({
          user_id: user?.id,
          lesson_id: lessonId,
          completed: true,
          completed_at: new Date().toISOString(),
        });
      
      setCompletedLessons(prev => new Set(prev).add(lessonId));
      toast.success("Aula marcada como concluída!");
      
      // Check if course is complete and issue certificate
      const newCompletedCount = completedLessons.size + 1;
      if (newCompletedCount === lessons.length && user?.id && id && !hasCertificate) {
        try {
          await supabase.rpc('check_and_issue_certificate', {
            p_user_id: user.id,
            p_course_id: id
          });
          
          // Fetch the newly created certificate
          const { data: newCert } = await supabase
            .from("certificates")
            .select("certificate_number, issued_at")
            .eq("user_id", user.id)
            .eq("course_id", id)
            .maybeSingle();
          
          if (newCert) {
            setHasCertificate(true);
            setCertificateData(newCert);
            toast.success("🎉 Parabéns! Seu certificado está pronto!");
          }
        } catch (certError) {
          console.error("Error issuing certificate:", certError);
        }
      }
    } catch (error) {
      console.error("Error updating progress:", error);
      toast.error("Erro ao atualizar progresso");
    }
  };

  const progressPercent = lessons.length > 0 
    ? (completedLessons.size / lessons.length) * 100 
    : 0;

  const totalMins = lessons.reduce((acc, l) => acc + (l.duration_minutes || 0), 0);
  const totalHours = Math.floor(totalMins / 60);
  const totalMinutes = totalMins % 60;

  const generateCertificate = async () => {
    if (!user || !course || !id) return;
    
    setGeneratingCertificate(true);
    try {
      // Generate unique certificate number
      const year = new Date().getFullYear();
      const random = Math.random().toString(36).substring(2, 8).toUpperCase();
      const timestamp = Date.now().toString(36).toUpperCase();
      const certificateNumber = `CERT-${year}-${random}-${timestamp}`;
      
      const { data, error } = await supabase
        .from("certificates")
        .insert({
          user_id: user.id,
          course_id: id,
          certificate_number: certificateNumber,
          issued_at: new Date().toISOString()
        })
        .select("certificate_number, issued_at")
        .single();
      
      if (error) throw error;
      
      setHasCertificate(true);
      setCertificateData(data);
      toast.success("Certificado gerado com sucesso!");
      setPreviewOpen(true);
    } catch (error) {
      console.error("Erro ao gerar certificado:", error);
      toast.error("Erro ao gerar certificado");
    } finally {
      setGeneratingCertificate(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 p-8 flex items-center justify-center">
          <p className="text-muted-foreground">Carregando curso...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/my-courses")}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para meus cursos
          </Button>

          <div className="animate-fade-in space-y-6">
            <div>
              <h1 className="text-4xl font-bold mb-2">{course?.title}</h1>
              <p className="text-muted-foreground mb-4">{course?.description}</p>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progresso do curso</span>
                <span className="font-medium">{Math.round(progressPercent)}%</span>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </div>

            <Collapsible open={infoOpen} onOpenChange={setInfoOpen}>
              <CollapsibleTrigger asChild>
                <Button 
                  variant="outline" 
                  className="w-full flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    Informações do Curso
                  </span>
                  <ChevronDown className={cn("w-4 h-4 transition-transform", infoOpen && "rotate-180")} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4">
                <Card className="border-primary/20">
                  <CardContent className="grid grid-cols-3 gap-4 pt-6">
                    {course?.duration && (
                      <div className="flex flex-col items-center justify-center p-4 bg-muted/50 rounded-lg">
                        <Clock className="w-8 h-8 text-primary mb-2" />
                        <p className="text-2xl font-bold text-primary">{formatDuration(course.duration)}</p>
                        <p className="text-sm text-muted-foreground">Duração</p>
                      </div>
                    )}
                    {modules.length > 0 && (
                      <div className="flex flex-col items-center justify-center p-4 bg-muted/50 rounded-lg">
                        <GraduationCap className="w-8 h-8 text-primary mb-2" />
                        <p className="text-2xl font-bold text-primary">{modules.length}</p>
                        <p className="text-sm text-muted-foreground">
                          {modules.length === 1 ? 'Módulo' : 'Módulos'}
                        </p>
                      </div>
                    )}
                    {lessons.length > 0 && (
                      <div className="flex flex-col items-center justify-center p-4 bg-muted/50 rounded-lg">
                        <BookOpen className="w-8 h-8 text-primary mb-2" />
                        <p className="text-2xl font-bold text-primary">{lessons.length}</p>
                        <p className="text-sm text-muted-foreground">
                          {lessons.length === 1 ? 'Aula' : 'Aulas'}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </CollapsibleContent>
            </Collapsible>

            {progressPercent >= 100 && (
              <Button 
                onClick={hasCertificate ? () => setPreviewOpen(true) : generateCertificate}
                className="w-full"
                size="lg"
                disabled={generatingCertificate}
              >
                <Award className="w-5 h-5 mr-2" />
                {generatingCertificate 
                  ? 'Gerando...' 
                  : hasCertificate 
                    ? 'Visualizar Certificado' 
                    : 'Gerar Certificado'}
              </Button>
            )}

            {certificateData && (
              <CertificatePreview
                open={previewOpen}
                onOpenChange={setPreviewOpen}
                courseTitle={course?.title || ""}
                studentName={profile?.full_name || "Estudante"}
                studentCPF={profile?.cpf || "000.000.000-00"}
                certificateNumber={certificateData.certificate_number}
                issuedAt={certificateData.issued_at}
                totalHours={totalHours}
                totalMinutes={totalMinutes}
              />
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {viewMode === 'lesson' && currentLesson && (
                <Tabs defaultValue="video" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="video">Vídeo</TabsTrigger>
                    <TabsTrigger value="quiz">Prova da Aula</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="video">
                    <div className="space-y-4">
                      <VideoPlayer 
                        youtubeUrl={currentLesson.youtube_url}
                        title={currentLesson.title}
                        onProgress90={() => {
                          if (!completedLessons.has(currentLesson.id)) {
                            toggleLessonComplete(currentLesson.id);
                          }
                        }}
                      />
                      
                      <Card>
                        <CardHeader>
                          <CardTitle>{currentLesson.title}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          {completedLessons.has(currentLesson.id) ? (
                            <div className="flex items-center justify-center gap-2 py-3 px-4 bg-muted rounded-md text-muted-foreground">
                              <CheckCircle2 className="w-4 h-4 text-green-500" />
                              <span>Aula concluída</span>
                            </div>
                          ) : (
                            <Button
                              onClick={() => toggleLessonComplete(currentLesson.id)}
                              className="w-full"
                            >
                              <Circle className="w-4 h-4 mr-2" />
                              Marcar como concluída
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="quiz">
                    <QuizTaker 
                      lessonId={currentLesson.id} 
                      onComplete={() => {
                        toast.success("Prova da aula concluída!");
                        loadCourse();
                      }}
                    />
                  </TabsContent>
                </Tabs>
              )}

              {viewMode === 'module-quiz' && currentModuleQuiz && (
                <div>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setViewMode('lesson');
                      setCurrentModuleQuiz(null);
                    }}
                    className="mb-4"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Voltar para aulas
                  </Button>
                  <ModuleQuizTaker
                    moduleId={currentModuleQuiz}
                    onComplete={() => {
                      toast.success("Prova do módulo concluída!");
                      loadCourse();
                      
                      // Find the next module and open it
                      const currentModuleIndex = modules.findIndex(m => m.id === currentModuleQuiz);
                      if (currentModuleIndex !== -1 && currentModuleIndex < modules.length - 1) {
                        const nextModule = modules[currentModuleIndex + 1];
                        if (nextModule.lessons.length > 0) {
                          setCurrentLesson(nextModule.lessons[0]);
                          setViewMode('lesson');
                          setCurrentModuleQuiz(null);
                          toast.success(`Avançando para ${nextModule.title}`);
                        } else {
                          setViewMode('lesson');
                          setCurrentModuleQuiz(null);
                        }
                      } else {
                        setViewMode('lesson');
                        setCurrentModuleQuiz(null);
                      }
                    }}
                  />
                </div>
              )}

              {viewMode === 'final-exam' && (
                <div>
                  <Button
                    variant="ghost"
                    onClick={() => setViewMode('lesson')}
                    className="mb-4"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Voltar para aulas
                  </Button>
                  <FinalExamTaker 
                    courseId={id!} 
                    courseTitle={course?.title || ""}
                    onComplete={() => {
                      toast.success("Prova final concluída!");
                      loadCourse();
                    }}
                  />
                </div>
              )}
            </div>

            <div className="space-y-4">
              <ModuleAccordion
                modules={modules}
                completedLessons={completedLessons}
                passedQuizzes={passedQuizzes}
                currentLessonId={currentLesson?.id || null}
                onSelectLesson={(lesson) => {
                  setCurrentLesson(lesson);
                  setViewMode('lesson');
                  setCurrentModuleQuiz(null);
                }}
                onSelectModuleQuiz={(moduleId) => {
                  setCurrentModuleQuiz(moduleId);
                  setViewMode('module-quiz');
                }}
              />

              <Button
                onClick={() => setViewMode('final-exam')}
                variant="outline"
                className="w-full border-2 border-primary hover:bg-primary/10"
              >
                Prova Final do Curso
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Course;
