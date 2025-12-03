import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Trash2, Plus, BookOpen, Layers, Award } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const quizSchema = z.object({
  title: z.string().min(3, 'Título deve ter no mínimo 3 caracteres'),
  passing_score: z.number().min(0).max(100),
  lesson_id: z.string().nullable().optional(),
  module_id: z.string().nullable().optional(),
  course_id: z.string().nullable().optional(),
  is_final_exam: z.boolean().default(false),
});

const questionSchema = z.object({
  question: z.string().min(5, 'Questão deve ter no mínimo 5 caracteres'),
  order_index: z.number().min(0),
});

const answerSchema = z.object({
  answer: z.string().min(1, 'Resposta não pode estar vazia'),
  is_correct: z.boolean(),
});

function AdminQuizzes() {
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [modules, setModules] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [questionDialogOpen, setQuestionDialogOpen] = useState(false);
  const [answerDialogOpen, setAnswerDialogOpen] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<any>(null);
  const [quizType, setQuizType] = useState<'lesson' | 'module' | 'final'>('lesson');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<{ type: 'quiz' | 'question' | 'answer', id: string, name: string } | null>(null);

  const quizForm = useForm<z.infer<typeof quizSchema>>({
    resolver: zodResolver(quizSchema),
    defaultValues: {
      title: '',
      passing_score: 70,
      is_final_exam: false,
      course_id: null,
      module_id: null,
      lesson_id: null,
    },
  });

  const questionForm = useForm({
    resolver: zodResolver(questionSchema),
    defaultValues: {
      question: '',
      order_index: 0,
    },
  });

  const answerForm = useForm({
    resolver: zodResolver(answerSchema),
    defaultValues: {
      answer: '',
      is_correct: false,
    },
  });

  useEffect(() => {
    fetchCourses();
    fetchQuizzes();
  }, []);

  const fetchCourses = async () => {
    const { data } = await supabase.from('courses').select('*').order('title');
    setCourses(data || []);
  };

  const fetchModules = async (courseId: string) => {
    const { data } = await supabase
      .from('modules')
      .select('*')
      .eq('course_id', courseId)
      .order('order_index');
    setModules(data || []);
  };

  const fetchLessons = async (moduleId: string) => {
    const { data } = await supabase
      .from('lessons')
      .select('*')
      .eq('module_id', moduleId)
      .order('order_index');
    setLessons(data || []);
  };

  const fetchQuizzes = async (courseId?: string) => {
    let query = supabase
      .from('quizzes')
      .select(`
        *,
        lessons(title),
        modules(title)
      `)
      .order('title');
    
    if (courseId) {
      query = query.eq('course_id', courseId);
    }
    
    const { data } = await query;
    setQuizzes(data || []);
  };

  const getQuizTypeInfo = (quiz: any) => {
    if (quiz.is_final_exam) {
      return { 
        label: 'Prova Final', 
        icon: Award, 
        color: 'bg-purple-500 text-white',
        description: 'Prova final do curso'
      };
    } else if (quiz.lesson_id) {
      return { 
        label: 'Prova de Aula', 
        icon: BookOpen, 
        color: 'bg-blue-500 text-white',
        description: quiz.lessons?.title || 'Aula'
      };
    } else if (quiz.module_id) {
      return { 
        label: 'Prova de Módulo', 
        icon: Layers, 
        color: 'bg-green-500 text-white',
        description: quiz.modules?.title || 'Módulo'
      };
    }
    return { 
      label: 'Prova', 
      icon: BookOpen, 
      color: 'bg-gray-500 text-white',
      description: ''
    };
  };

  const fetchQuestions = async (quizId: string) => {
    const { data: questionsData } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('quiz_id', quizId)
      .order('order_index');

    const questionsWithAnswers = await Promise.all(
      (questionsData || []).map(async (q) => {
        const { data: answers } = await supabase
          .from('quiz_answers')
          .select('*')
          .eq('question_id', q.id);
        return { ...q, answers: answers || [] };
      })
    );

    setQuestions(questionsWithAnswers);
  };

  const onSubmitQuiz = async (values: any) => {
    const { error } = await supabase.from('quizzes').insert([values]);
    if (error) {
      toast.error('Erro ao criar prova');
    } else {
      toast.success('Prova criada com sucesso!');
      fetchQuizzes();
      setDialogOpen(false);
      quizForm.reset();
    }
  };

  const handleDeleteClick = (type: 'quiz' | 'question' | 'answer', id: string, name: string) => {
    setDeletingItem({ type, id, name });
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingItem) return;

    if (deletingItem.type === 'quiz') {
      const { error } = await supabase.from('quizzes').delete().eq('id', deletingItem.id);
      if (error) {
        toast.error('Erro ao deletar prova');
      } else {
        toast.success('Prova deletada!');
        fetchQuizzes();
        if (selectedQuiz?.id === deletingItem.id) {
          setSelectedQuiz(null);
          setQuestions([]);
        }
      }
    } else if (deletingItem.type === 'question') {
      const { error } = await supabase.from('quiz_questions').delete().eq('id', deletingItem.id);
      if (error) {
        toast.error('Erro ao deletar questão');
      } else {
        toast.success('Questão deletada!');
        fetchQuestions(selectedQuiz.id);
      }
    } else {
      const { error } = await supabase.from('quiz_answers').delete().eq('id', deletingItem.id);
      if (error) {
        toast.error('Erro ao deletar resposta');
      } else {
        toast.success('Resposta deletada!');
        fetchQuestions(selectedQuiz.id);
      }
    }

    setDeleteDialogOpen(false);
    setDeletingItem(null);
  };

  const onSubmitQuestion = async (values: any) => {
    const { error } = await supabase.from('quiz_questions').insert([
      {
        quiz_id: selectedQuiz.id,
        ...values,
      },
    ]);
    if (error) {
      toast.error('Erro ao criar questão');
    } else {
      toast.success('Questão criada!');
      fetchQuestions(selectedQuiz.id);
      setQuestionDialogOpen(false);
      questionForm.reset();
    }
  };

  const onSubmitAnswer = async (values: any) => {
    const { error } = await supabase.from('quiz_answers').insert([
      {
        question_id: selectedQuestion.id,
        ...values,
      },
    ]);
    if (error) {
      toast.error('Erro ao criar resposta');
    } else {
      toast.success('Resposta criada!');
      fetchQuestions(selectedQuiz.id);
      setAnswerDialogOpen(false);
      answerForm.reset();
    }
  };

  return (
    <div className="space-y-8">
      <main className="w-full">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex justify-between items-center">
            <h1 className="text-4xl font-bold">Gerenciar Provas</h1>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Prova
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Nova Prova</DialogTitle>
                </DialogHeader>
                <form onSubmit={quizForm.handleSubmit(onSubmitQuiz)} className="space-y-4">
                  <div>
                    <Label>Título</Label>
                    <Input {...quizForm.register('title')} />
                  </div>
                  <div>
                    <Label>Nota Mínima (%)</Label>
                    <Input
                      type="number"
                      {...quizForm.register('passing_score', { valueAsNumber: true })}
                    />
                  </div>
                  <div>
                    <Label>Tipo</Label>
                    <Select
                      onValueChange={(val: any) => {
                        setQuizType(val);
                        quizForm.setValue('is_final_exam', val === 'final');
                        quizForm.setValue('lesson_id', null);
                        quizForm.setValue('module_id', null);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lesson">Prova de Aula</SelectItem>
                        <SelectItem value="module">Prova de Módulo</SelectItem>
                        <SelectItem value="final">Prova Final</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Curso</Label>
                    <Select
                      onValueChange={(val) => {
                        quizForm.setValue('course_id', val);
                        setModules([]);
                        setLessons([]);
                        fetchModules(val);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o curso" />
                      </SelectTrigger>
                      <SelectContent>
                        {courses.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {(quizType === 'module' || quizType === 'lesson') && modules.length > 0 && (
                    <div>
                      <Label>Módulo</Label>
                      <Select
                        onValueChange={(val) => {
                          quizForm.setValue('module_id', val);
                          if (quizType === 'lesson') {
                            setLessons([]);
                            fetchLessons(val);
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o módulo" />
                        </SelectTrigger>
                        <SelectContent>
                          {modules.map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {quizType === 'lesson' && lessons.length > 0 && (
                    <div>
                      <Label>Aula</Label>
                      <Select
                        onValueChange={(val) => {
                          quizForm.setValue('lesson_id', val);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a aula" />
                        </SelectTrigger>
                        <SelectContent>
                          {lessons.map((l) => (
                            <SelectItem key={l.id} value={l.id}>
                              {l.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <Button type="submit" className="w-full">
                    Criar Prova
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Cursos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {courses.map((course) => (
                  <div
                    key={course.id}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedCourse?.id === course.id ? 'bg-accent' : 'hover:bg-accent/50'
                    }`}
                    onClick={() => {
                      setSelectedCourse(course);
                      fetchQuizzes(course.id);
                    }}
                  >
                    <span className="font-medium">{course.title}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {selectedCourse && (
              <Card>
                <CardHeader>
                  <CardTitle>Provas - {selectedCourse.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {quizzes.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhuma prova criada para este curso
                    </p>
                  ) : (
                    quizzes.map((quiz) => {
                      const typeInfo = getQuizTypeInfo(quiz);
                      const Icon = typeInfo.icon;
                      
                      return (
                        <div
                          key={quiz.id}
                          className="p-4 rounded-lg border hover:bg-muted cursor-pointer transition-colors"
                          onClick={() => {
                            setSelectedQuiz(quiz);
                            fetchQuestions(quiz.id);
                          }}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2">
                                <Icon className="w-4 h-4 text-muted-foreground" />
                                <span className="font-medium">{quiz.title}</span>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Badge className={typeInfo.color}>
                                  {typeInfo.label}
                                </Badge>
                                {typeInfo.description && (
                                  <Badge variant="outline" className="text-xs">
                                    {typeInfo.description}
                                  </Badge>
                                )}
                                <Badge variant="secondary">
                                  Nota mínima: {quiz.passing_score}%
                                </Badge>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteClick('quiz', quiz.id, quiz.title);
                              }}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            )}

            {selectedQuiz && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    <span>Questões - {selectedQuiz.title}</span>
                    <Dialog open={questionDialogOpen} onOpenChange={setQuestionDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm">
                          <Plus className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Nova Questão</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={questionForm.handleSubmit(onSubmitQuestion)} className="space-y-4">
                          <div>
                            <Label>Questão</Label>
                            <Input {...questionForm.register('question')} />
                          </div>
                          <div>
                            <Label>Ordem</Label>
                            <Input
                              type="number"
                              {...questionForm.register('order_index', { valueAsNumber: true })}
                            />
                          </div>
                          <Button type="submit" className="w-full">
                            Criar Questão
                          </Button>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {questions.map((q) => (
                    <div key={q.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex justify-between items-start">
                        <p className="font-medium">{q.question}</p>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteClick('question', q.id, q.question)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="pl-4 space-y-1">
                        {q.answers?.map((a: any) => (
                          <div
                            key={a.id}
                            className={`flex justify-between items-center p-2 rounded ${
                              a.is_correct ? 'bg-green-50 dark:bg-green-900/20' : 'bg-muted'
                            }`}
                          >
                            <span className="text-sm">{a.answer}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteClick('answer', a.id, a.answer)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                        <Dialog open={answerDialogOpen} onOpenChange={setAnswerDialogOpen}>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full mt-2"
                              onClick={() => setSelectedQuestion(q)}
                            >
                              <Plus className="w-3 h-3 mr-2" />
                              Adicionar Resposta
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Nova Resposta</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={answerForm.handleSubmit(onSubmitAnswer)} className="space-y-4">
                              <div>
                                <Label>Resposta</Label>
                                <Input {...answerForm.register('answer')} />
                              </div>
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  {...answerForm.register('is_correct')}
                                  className="w-4 h-4"
                                />
                                <Label>Resposta Correta</Label>
                              </div>
                              <Button type="submit" className="w-full">
                                Criar Resposta
                              </Button>
                            </form>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir {deletingItem?.type === 'quiz' ? 'a prova' : deletingItem?.type === 'question' ? 'a questão' : 'a resposta'} <strong>{deletingItem?.name}</strong>? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setDeletingItem(null)}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
}

export default AdminQuizzes;
