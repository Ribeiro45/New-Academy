import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Sidebar } from "@/components/layout/Sidebar";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { User } from "@supabase/supabase-js";
import { toast } from "sonner";
import { BookOpen, Clock, Award, Info } from "lucide-react";

interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  duration: string;
  total_modules: number;
  total_lessons: number;
  course_target: string;
}

interface Enrollment {
  course_id: string;
}

const Courses = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [showCourseDialog, setShowCourseDialog] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
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
  }, [user]);

  useEffect(() => {
    if (!user) return;

    // Subscribe to enrollment changes (INSERT and DELETE)
    const channel = supabase
      .channel('enrollments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'enrollments',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const loadData = async () => {
    try {
      // Get user profile to check user_type
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_type")
        .eq("id", user?.id)
        .single();

      const userType = profile?.user_type || 'colaborador';

      // Fetch all courses and course access
      const [coursesRes, enrollmentsRes, courseAccessRes] = await Promise.all([
        supabase.from("courses").select("*"),
        supabase.from("enrollments").select("course_id"),
        supabase.from("course_access").select("*"),
      ]);

      if (coursesRes.data && courseAccessRes.data) {
        // Filter courses based on user type and course access
        const accessibleCourses = coursesRes.data.filter(course => {
          // Check all access rules for this course
          const accessRulesForCourse = courseAccessRes.data.filter(a => a.course_id === course.id);
          
          if (accessRulesForCourse.length > 0) {
            // If course has access rules, ONLY those user types can see it
            return accessRulesForCourse.some(rule => rule.user_type === userType);
          } else {
            // If no access rules, use course_target default
            return course.course_target === 'both' || course.course_target === userType;
          }
        });
        
        setCourses(accessibleCourses);
      }
      if (enrollmentsRes.data) setEnrollments(enrollmentsRes.data);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const isEnrolled = (courseId: string) => {
    return enrollments.some(e => e.course_id === courseId);
  };

  const handleViewCourse = (course: Course) => {
    setSelectedCourse(course);
    setShowCourseDialog(true);
  };

  const handleEnroll = async (courseId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("enrollments")
        .insert({ user_id: user.id, course_id: courseId });

      if (error) throw error;

      toast.success("Inscrito no curso com sucesso!");
      setShowCourseDialog(false);
      loadData();
    } catch (error) {
      console.error("Error enrolling:", error);
      toast.error("Erro ao se inscrever no curso");
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="animate-fade-in">
            <h1 className="text-4xl font-bold mb-2">Cursos Disponíveis</h1>
            <p className="text-muted-foreground">Inscreva-se nos cursos e comece a aprender</p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="space-y-4">
                  <Skeleton className="h-48 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course, index) => (
                <Card 
                  key={course.id} 
                  className="animate-fade-in overflow-hidden"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="aspect-video relative overflow-hidden">
                    <img
                      src={course.thumbnail_url || "/placeholder.svg"}
                      alt={course.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <CardHeader>
                    <CardTitle>{course.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="mb-4">
                      {course.description}
                    </CardDescription>
                    <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                      {course.total_modules && (
                        <div className="flex items-center gap-1">
                          <BookOpen className="w-4 h-4" />
                          <span>{course.total_modules} {course.total_modules === 1 ? 'módulo' : 'módulos'}</span>
                        </div>
                      )}
                      {course.total_lessons && (
                        <div className="flex items-center gap-1">
                          <Award className="w-4 h-4" />
                          <span>{course.total_lessons} {course.total_lessons === 1 ? 'aula' : 'aulas'}</span>
                        </div>
                      )}
                      {course.duration && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{course.duration}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="flex flex-col gap-2">
                    {isEnrolled(course.id) ? (
                      <Button 
                        className="w-full" 
                        onClick={() => navigate(`/course/${course.id}`)}
                      >
                        Acessar Curso
                      </Button>
                    ) : (
                      <>
                        <Button 
                          variant="outline"
                          className="w-full"
                          onClick={() => handleViewCourse(course)}
                        >
                          <Info className="w-4 h-4 mr-2" />
                          Ver Detalhes
                        </Button>
                        <Button 
                          className="w-full" 
                          onClick={() => handleEnroll(course.id)}
                        >
                          Inscrever-se
                        </Button>
                      </>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>

        <Dialog open={showCourseDialog} onOpenChange={setShowCourseDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedCourse?.title}</DialogTitle>
              <DialogDescription>{selectedCourse?.description}</DialogDescription>
            </DialogHeader>
            
            {selectedCourse && (
              <div className="space-y-4">
                {selectedCourse.thumbnail_url && (
                  <div className="aspect-video relative overflow-hidden rounded-lg">
                    <img
                      src={selectedCourse.thumbnail_url || "/placeholder.svg"}
                      alt={selectedCourse.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                
                <div className="grid grid-cols-3 gap-4">
                  {selectedCourse.total_modules && (
                    <div className="flex flex-col items-center justify-center p-4 bg-muted/50 rounded-lg">
                      <BookOpen className="w-6 h-6 text-primary mb-2" />
                      <p className="text-xl font-bold text-primary">{selectedCourse.total_modules}</p>
                      <p className="text-xs text-muted-foreground">
                        {selectedCourse.total_modules === 1 ? 'Módulo' : 'Módulos'}
                      </p>
                    </div>
                  )}
                  {selectedCourse.total_lessons && (
                    <div className="flex flex-col items-center justify-center p-4 bg-muted/50 rounded-lg">
                      <Award className="w-6 h-6 text-primary mb-2" />
                      <p className="text-xl font-bold text-primary">{selectedCourse.total_lessons}</p>
                      <p className="text-xs text-muted-foreground">
                        {selectedCourse.total_lessons === 1 ? 'Aula' : 'Aulas'}
                      </p>
                    </div>
                  )}
                  {selectedCourse.duration && (
                    <div className="flex flex-col items-center justify-center p-4 bg-muted/50 rounded-lg">
                      <Clock className="w-6 h-6 text-primary mb-2" />
                      <p className="text-xl font-bold text-primary">{selectedCourse.duration}</p>
                      <p className="text-xs text-muted-foreground">Duração</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCourseDialog(false)}>
                Fechar
              </Button>
              <Button onClick={() => selectedCourse && handleEnroll(selectedCourse.id)}>
                Inscrever-se Agora
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default Courses;
