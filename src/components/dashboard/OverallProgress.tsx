import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Award, BookOpen, CheckCircle, Clock } from "lucide-react";

interface OverallProgressProps {
  totalCourses: number;
  completedCourses: number;
  totalLessons: number;
  completedLessons: number;
  certificates: number;
  studyTime: number;
}

export const OverallProgress = ({
  totalCourses,
  completedCourses,
  totalLessons,
  completedLessons,
  certificates,
  studyTime,
}: OverallProgressProps) => {
  const overallProgress = totalLessons > 0 
    ? (completedLessons / totalLessons) * 100 
    : 0;

  const formatStudyTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}min`;
    }
    return `${mins}min`;
  };

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="w-5 h-5 text-primary" />
          Seu Progresso Geral
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium">Progresso Total</span>
            <span className="font-bold text-primary">{Math.round(overallProgress)}%</span>
          </div>
          <Progress value={overallProgress} className="h-3" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 rounded-lg bg-background/50">
            <div className="flex items-center justify-center gap-1 mb-1">
              <BookOpen className="w-4 h-4 text-primary" />
            </div>
            <div className="text-2xl font-bold text-primary">{totalCourses}</div>
            <div className="text-xs text-muted-foreground">Cursos</div>
          </div>

          <div className="text-center p-3 rounded-lg bg-background/50">
            <div className="flex items-center justify-center gap-1 mb-1">
              <CheckCircle className="w-4 h-4 text-accent" />
            </div>
            <div className="text-2xl font-bold text-accent">{completedLessons}</div>
            <div className="text-xs text-muted-foreground">Aulas Concluídas</div>
          </div>

          <div className="text-center p-3 rounded-lg bg-background/50">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Clock className="w-4 h-4 text-primary" />
            </div>
            <div className="text-2xl font-bold text-primary">{formatStudyTime(studyTime)}</div>
            <div className="text-xs text-muted-foreground">Tempo de Estudo</div>
          </div>

          <div className="text-center p-3 rounded-lg bg-background/50">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Award className="w-4 h-4 text-accent" />
            </div>
            <div className="text-2xl font-bold text-accent">{certificates}</div>
            <div className="text-xs text-muted-foreground">Certificados</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
