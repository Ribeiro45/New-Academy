import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Circle, BookOpen, FileCheck, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface Lesson {
  id: string;
  title: string;
  youtube_url: string;
  duration_minutes: number;
  order_index: number;
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

interface ModuleAccordionProps {
  modules: Module[];
  completedLessons: Set<string>;
  passedQuizzes: Set<string>;
  currentLessonId: string | null;
  onSelectLesson: (lesson: Lesson) => void;
  onSelectModuleQuiz: (moduleId: string) => void;
}

export const ModuleAccordion = ({
  modules,
  completedLessons,
  passedQuizzes,
  currentLessonId,
  onSelectLesson,
  onSelectModuleQuiz,
}: ModuleAccordionProps) => {
  
  // Check if a lesson is unlocked
  const isLessonUnlocked = (lesson: Lesson, lessonIndex: number, moduleLessons: Lesson[]) => {
    // First lesson of the module is always unlocked
    if (lessonIndex === 0) return true;
    
    // Check previous lesson
    const previousLesson = moduleLessons[lessonIndex - 1];
    
    // Previous lesson must have a quiz and user must pass it to unlock this lesson
    if (previousLesson.hasQuiz && previousLesson.quizId) {
      return passedQuizzes.has(previousLesson.quizId);
    }
    
    // If previous lesson doesn't have a quiz, it must be completed
    return completedLessons.has(previousLesson.id);
  };
  return (
    <Card>
      <Accordion type="single" collapsible className="w-full">
        {modules.map((module) => {
          const totalLessons = module.lessons.length;
          const completedCount = module.lessons.filter(l => completedLessons.has(l.id)).length;
          const moduleProgress = totalLessons > 0 ? (completedCount / totalLessons) * 100 : 0;
          
          return (
            <AccordionItem key={module.id} value={module.id}>
              <AccordionTrigger className="px-4 hover:no-underline">
                <div className="flex items-center justify-between w-full pr-4">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center",
                      moduleProgress === 100 
                        ? "bg-green-500/20 text-green-600 dark:text-green-400" 
                        : "bg-primary/10 text-primary"
                    )}>
                      {moduleProgress === 100 ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <BookOpen className="w-5 h-5" />
                      )}
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold">{module.title}</h3>
                      <p className="text-xs text-muted-foreground">
                        {completedCount} de {totalLessons} aulas concluídas
                      </p>
                    </div>
                  </div>
                  <div className={cn(
                    "text-xs font-medium",
                    moduleProgress === 100 ? "text-green-600 dark:text-green-400" : "text-primary"
                  )}>
                    {Math.round(moduleProgress)}%
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                {module.description && (
                  <p className="text-sm text-muted-foreground mb-4 px-2">
                    {module.description}
                  </p>
                )}
                <div className="space-y-2">
                  {module.lessons.map((lesson, lessonIndex) => {
                    const isCompleted = completedLessons.has(lesson.id);
                    const isCurrent = currentLessonId === lesson.id;
                    const isUnlocked = isLessonUnlocked(lesson, lessonIndex, module.lessons);
                    
                    return (
                      <button
                        key={lesson.id}
                        onClick={() => isUnlocked && onSelectLesson(lesson)}
                        disabled={!isUnlocked}
                        className={cn(
                          "w-full text-left p-3 rounded-lg transition-colors flex items-start gap-3",
                          !isUnlocked && "opacity-50 cursor-not-allowed",
                          isCurrent 
                            ? "bg-primary/10 border-2 border-primary" 
                            : isUnlocked ? "hover:bg-muted border-2 border-transparent" : "border-2 border-transparent"
                        )}
                      >
                        {!isUnlocked ? (
                          <Lock className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                        ) : isCompleted ? (
                          <CheckCircle2 className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                        ) : (
                          <Circle className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium line-clamp-2">
                            {lesson.title}
                            {!isUnlocked && " (Bloqueada)"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {!isUnlocked ? (
                              lessonIndex > 0 && module.lessons[lessonIndex - 1].hasQuiz
                                ? "Passe na prova anterior para desbloquear"
                                : "Complete a aula anterior para desbloquear"
                            ) : `${lesson.duration_minutes} min`}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                  
                  {module.hasQuiz && (
                    <button
                      onClick={() => onSelectModuleQuiz(module.id)}
                      className="w-full text-left p-3 rounded-lg transition-colors flex items-start gap-3 bg-accent/10 hover:bg-accent/20 border-2 border-accent/30"
                    >
                      <FileCheck className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">Prova do Módulo</p>
                        <p className="text-sm text-muted-foreground">
                          Complete para avançar
                        </p>
                      </div>
                    </button>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </Card>
  );
};