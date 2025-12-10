import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Sidebar } from "@/components/layout/Sidebar";
import { CourseCard } from "@/components/course/CourseCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { User } from "@supabase/supabase-js";
import { toast } from "sonner";

interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string;
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

const MyCourses = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [loading, setLoading] = useState(true);

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
      setLoading(true);
      const [enrollmentsRes, progressRes] = await Promise.all([
        supabase.from("enrollments").select("course_id"),
        supabase.from("user_progress").select("*"),
      ]);

      if (enrollmentsRes.data) {
        const courseIds = enrollmentsRes.data
          .map((e: any) => e.course_id)
          .filter((id: string | null) => !!id);

        let enrolledCourses: Course[] = [];
        if (courseIds.length > 0) {
          const { data: coursesData } = await supabase
            .from("courses")
            .select("*")
            .in("id", courseIds);
          enrolledCourses = (coursesData as Course[]) || [];
          
          // Get only lessons from enrolled courses
          const { data: lessonsData } = await supabase
            .from("lessons")
            .select("*")
            .in("course_id", courseIds);
          setLessons(lessonsData || []);
        }
        setCourses(enrolledCourses);
      } else {
        setCourses([]);
        setLessons([]);
      }

      if (progressRes.data) setProgress(progressRes.data);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getCourseStats = (courseId: string) => {
    const courseLessons = lessons.filter(l => l.course_id === courseId);
    const completedLessons = courseLessons.filter(l => 
      progress.some(p => p.lesson_id === l.id && p.completed)
    );
    
    const totalDuration = courseLessons.reduce((sum, l) => sum + (l.duration_minutes || 0), 0);
    const progressPercent = courseLessons.length > 0 
      ? (completedLessons.length / courseLessons.length) * 100 
      : 0;

    return {
      totalLessons: courseLessons.length,
      completedLessons: completedLessons.length,
      totalDuration,
      progress: progressPercent,
    };
  };

  const handleUnenroll = async (courseId: string, courseTitle: string) => {
    // Check if course is completed (100% progress)
    const stats = getCourseStats(courseId);
    if (stats.progress >= 100) {
      toast.error("Não é possível cancelar inscrição de um curso já finalizado");
      return;
    }

    if (!confirm(`Tem certeza que deseja cancelar sua inscrição em "${courseTitle}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("enrollments")
        .delete()
        .eq("user_id", user?.id)
        .eq("course_id", courseId);

      if (error) throw error;

      toast.success("Inscrição cancelada com sucesso!");
      loadData();
    } catch (error) {
      console.error("Error unenrolling:", error);
      toast.error("Erro ao cancelar inscrição");
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="animate-fade-in">
            <h1 className="text-4xl font-bold mb-2">Meus Cursos</h1>
            <p className="text-muted-foreground">Cursos nos quais você está inscrito</p>
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
          ) : courses.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">Você ainda não está inscrito em nenhum curso.</p>
              <p className="text-muted-foreground">Vá para a aba "Cursos" para se inscrever.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course, index) => {
                const stats = getCourseStats(course.id);
                return (
                  <div 
                    key={course.id} 
                    className="animate-fade-in space-y-2"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <CourseCard
                      id={course.id}
                      title={course.title}
                      description={course.description || ""}
                      thumbnailUrl={course.thumbnail_url || ""}
                      progress={stats.progress}
                      totalLessons={stats.totalLessons}
                      completedLessons={stats.completedLessons}
                      totalDuration={stats.totalDuration}
                    />
                    {stats.progress < 100 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleUnenroll(course.id, course.title)}
                      >
                        Cancelar Inscrição
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default MyCourses;
