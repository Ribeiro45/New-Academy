import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Clock, PlayCircle } from "lucide-react";
import { Link } from "react-router-dom";

interface CourseCardProps {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  progress: number;
  totalLessons: number;
  completedLessons: number;
  totalDuration: number;
}

export const CourseCard = ({
  id,
  title,
  description,
  thumbnailUrl,
  progress,
  totalLessons,
  completedLessons,
  totalDuration,
}: CourseCardProps) => {
  return (
    <Link to={`/course/${id}`}>
      <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden">
        <div className="relative h-48 overflow-hidden">
          <img 
            src={thumbnailUrl} 
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <PlayCircle className="w-16 h-16 text-white" />
          </div>
        </div>
        
        <CardHeader>
          <CardTitle className="line-clamp-1">{title}</CardTitle>
          <CardDescription className="line-clamp-2">{description}</CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progresso</span>
              <span className="font-medium">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
          
          <div className="flex justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <PlayCircle className="w-4 h-4" />
              <span>{completedLessons}/{totalLessons} {totalLessons === 1 ? 'aula' : 'aulas'}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{totalDuration}min</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};
