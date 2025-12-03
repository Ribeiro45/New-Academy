import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Plus, Trash2, Edit, ClipboardList } from 'lucide-react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const courseSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().optional(),
  thumbnail_url: z.string().url('URL inválida').optional().or(z.literal('')),
  duration: z.string().optional(),
  total_modules: z.number().min(0).optional(),
  total_lessons: z.number().min(0).optional(),
  course_target: z.enum(['colaborador', 'cliente', 'both']).default('both'),
});

const lessonSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  youtube_url: z.string().url('URL inválida'),
  duration_minutes: z.number().min(1, 'Duração deve ser maior que 0').optional(),
  module_id: z.string().optional(),
});

const moduleSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().optional(),
});

const quizSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  passing_score: z.number().min(0).max(100).default(70),
});

function AdminCourses() {
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [lessons, setLessons] = useState<any[]>([]);
  const [modules, setModules] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [lessonDialogOpen, setLessonDialogOpen] = useState(false);
  const [quizDialogOpen, setQuizDialogOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<any>(null);
  const [editingCourse, setEditingCourse] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedLessonForQuiz, setSelectedLessonForQuiz] = useState<any>(null);
  const [selectedModuleForQuiz, setSelectedModuleForQuiz] = useState<any>(null);
  const [quizType, setQuizType] = useState<'lesson' | 'module' | 'final'>('lesson');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<{ type: 'course' | 'lesson' | 'module', id: string, name: string } | null>(null);
  const [moduleDialogOpen, setModuleDialogOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<any>(null);

  const courseForm = useForm({
    resolver: zodResolver(courseSchema),
    defaultValues: { 
      title: '', 
      description: '', 
      thumbnail_url: '',
      duration: '',
      total_modules: 0,
      total_lessons: 0,
      course_target: 'both' as const,
    },
  });

  const lessonForm = useForm({
    resolver: zodResolver(lessonSchema),
    defaultValues: { title: '', youtube_url: '', duration_minutes: 0, module_id: 'none' },
  });

  const moduleForm = useForm({
    resolver: zodResolver(moduleSchema),
    defaultValues: { title: '', description: '' },
  });

  const quizForm = useForm({
    resolver: zodResolver(quizSchema),
    defaultValues: { title: '', passing_score: 70 },
  });

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      fetchLessons(selectedCourse.id);
      fetchModules(selectedCourse.id);
    }
  }, [selectedCourse]);

  const fetchCourses = async () => {
    const { data } = await supabase.from('courses').select('*').order('created_at', { ascending: false });
    setCourses(data || []);
  };

  const fetchLessons = async (courseId: string) => {
    const { data } = await supabase
      .from('lessons')
      .select('*')
      .eq('course_id', courseId)
      .order('order_index', { ascending: true });
    setLessons(data || []);
  };

  const fetchModules = async (courseId: string) => {
    const { data } = await supabase
      .from('modules')
      .select('*')
      .eq('course_id', courseId)
      .order('order_index', { ascending: true });
    setModules(data || []);
  };

  const onSubmitCourse = async (values: z.infer<typeof courseSchema>) => {
    if (editingCourse) {
      // Update existing course
      const { error } = await supabase
        .from('courses')
        .update({
          title: values.title,
          description: values.description || null,
          thumbnail_url: values.thumbnail_url || null,
          duration: values.duration || null,
          total_modules: values.total_modules || null,
          total_lessons: values.total_lessons || null,
          course_target: values.course_target || 'both',
        })
        .eq('id', editingCourse.id);
      
      if (error) {
        toast.error('Erro ao atualizar curso');
      } else {
        toast.success('Curso atualizado com sucesso!');
        setDialogOpen(false);
        setEditingCourse(null);
        courseForm.reset();
        fetchCourses();
      }
    } else {
      // Insert new course
      const { error } = await supabase.from('courses').insert([{
        title: values.title,
        description: values.description || null,
        thumbnail_url: values.thumbnail_url || null,
        duration: values.duration || null,
        total_modules: values.total_modules || null,
        total_lessons: values.total_lessons || null,
        course_target: values.course_target || 'both',
      }]);
      
      if (error) {
        toast.error('Erro ao criar curso');
      } else {
        toast.success('Curso criado com sucesso!');
        setDialogOpen(false);
        courseForm.reset();
        fetchCourses();
      }
    }
  };

  const handleUploadThumbnail = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `course-thumbnails/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      courseForm.setValue('thumbnail_url', publicUrl);
      toast.success('Imagem carregada com sucesso!');
    } catch (error) {
      console.error('Error uploading:', error);
      toast.error('Erro ao fazer upload da imagem');
    } finally {
      setUploading(false);
    }
  };

  const onSubmitLesson = async (values: z.infer<typeof lessonSchema>) => {
    if (!selectedCourse) return;

    const moduleId = values.module_id === 'none' ? null : values.module_id;

    if (editingLesson) {
      // Update existing lesson
      const { error } = await supabase
        .from('lessons')
        .update({
          title: values.title,
          youtube_url: values.youtube_url,
          duration_minutes: values.duration_minutes || null,
          module_id: moduleId,
        })
        .eq('id', editingLesson.id);
      
      if (error) {
        toast.error('Erro ao atualizar aula');
      } else {
        toast.success('Aula atualizada com sucesso!');
        setLessonDialogOpen(false);
        setEditingLesson(null);
        lessonForm.reset();
        fetchLessons(selectedCourse.id);
      }
    } else {
      // Insert new lesson
      const { error } = await supabase.from('lessons').insert([{
        title: values.title,
        youtube_url: values.youtube_url,
        duration_minutes: values.duration_minutes || null,
        module_id: moduleId,
        course_id: selectedCourse.id,
        order_index: lessons.length,
      }]);
      
      if (error) {
        toast.error('Erro ao adicionar aula');
      } else {
        toast.success('Aula adicionada com sucesso!');
        setLessonDialogOpen(false);
        lessonForm.reset();
        fetchLessons(selectedCourse.id);
      }
    }
  };

  const onSubmitModule = async (values: z.infer<typeof moduleSchema>) => {
    if (!selectedCourse) return;

    if (editingModule) {
      const { error } = await supabase
        .from('modules')
        .update({
          title: values.title,
          description: values.description || null,
        })
        .eq('id', editingModule.id);
      
      if (error) {
        toast.error('Erro ao atualizar módulo');
      } else {
        toast.success('Módulo atualizado com sucesso!');
        setModuleDialogOpen(false);
        setEditingModule(null);
        moduleForm.reset();
        fetchModules(selectedCourse.id);
      }
    } else {
      const { error } = await supabase.from('modules').insert([{
        title: values.title,
        description: values.description || null,
        course_id: selectedCourse.id,
        order_index: modules.length,
      }]);
      
      if (error) {
        toast.error('Erro ao criar módulo');
      } else {
        toast.success('Módulo criado com sucesso!');
        setModuleDialogOpen(false);
        moduleForm.reset();
        fetchModules(selectedCourse.id);
      }
    }
  };

  const handleDeleteClick = (type: 'course' | 'lesson' | 'module', id: string, name: string) => {
    setDeletingItem({ type, id, name });
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingItem) return;

    if (deletingItem.type === 'course') {
      const { error } = await supabase.from('courses').delete().eq('id', deletingItem.id);
      
      if (error) {
        toast.error('Erro ao deletar curso');
      } else {
        toast.success('Curso deletado com sucesso!');
        fetchCourses();
        if (selectedCourse?.id === deletingItem.id) {
          setSelectedCourse(null);
        }
      }
    } else if (deletingItem.type === 'module') {
      const { error } = await supabase.from('modules').delete().eq('id', deletingItem.id);
      
      if (error) {
        toast.error('Erro ao deletar módulo');
      } else {
        toast.success('Módulo deletado com sucesso!');
        fetchModules(selectedCourse.id);
      }
    } else {
      const { error } = await supabase.from('lessons').delete().eq('id', deletingItem.id);
      
      if (error) {
        toast.error('Erro ao deletar aula');
      } else {
        toast.success('Aula deletada com sucesso!');
        fetchLessons(selectedCourse.id);
      }
    }

    setDeleteDialogOpen(false);
    setDeletingItem(null);
  };

  const onSubmitQuiz = async (values: z.infer<typeof quizSchema>) => {
    if (!selectedCourse) return;

    const quizData: any = {
      title: values.title,
      passing_score: values.passing_score,
      course_id: selectedCourse.id,
      is_final_exam: quizType === 'final',
    };

    if (quizType === 'lesson' && selectedLessonForQuiz) {
      quizData.lesson_id = selectedLessonForQuiz.id;
    } else if (quizType === 'module' && selectedModuleForQuiz) {
      quizData.module_id = selectedModuleForQuiz.id;
    }

    const { error } = await supabase.from('quizzes').insert([quizData]);
    
    if (error) {
      toast.error('Erro ao criar prova');
    } else {
      toast.success('Prova criada com sucesso!');
      setQuizDialogOpen(false);
      quizForm.reset();
      setSelectedLessonForQuiz(null);
      setSelectedModuleForQuiz(null);
    }
  };

  return (
    <div className="space-y-8">
      <main className="w-full">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">Gerenciar Cursos</h1>
              <p className="text-muted-foreground">Adicione e gerencie cursos e aulas</p>
            </div>
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) {
                setEditingCourse(null);
                courseForm.reset();
              }
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Curso
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingCourse ? 'Editar Curso' : 'Criar Novo Curso'}</DialogTitle>
                </DialogHeader>
                <Form {...courseForm}>
                  <form onSubmit={courseForm.handleSubmit(onSubmitCourse)} className="space-y-4">
                    <FormField
                      control={courseForm.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Título</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={courseForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descrição</FormLabel>
                          <FormControl>
                            <Textarea {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={courseForm.control}
                      name="thumbnail_url"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Capa do Curso</FormLabel>
                          <FormControl>
                            <div className="space-y-2">
                              <Input {...field} placeholder="URL da imagem" />
                              <div className="flex items-center gap-2">
                                <Input
                                  type="file"
                                  accept="image/*"
                                  onChange={handleUploadThumbnail}
                                  disabled={uploading}
                                />
                                {uploading && <span className="text-sm text-muted-foreground">Enviando...</span>}
                              </div>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={courseForm.control}
                      name="duration"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Duração (ex: 8 horas)</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="8 horas" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={courseForm.control}
                        name="total_modules"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Módulos</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={courseForm.control}
                        name="total_lessons"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Aulas</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <Button type="submit" className="w-full">
                      {editingCourse ? 'Atualizar Curso' : 'Criar Curso'}
                    </Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle>Cursos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {courses.map((course) => (
                  <div
                    key={course.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedCourse?.id === course.id ? 'bg-accent' : 'hover:bg-accent/50'
                    }`}
                    onClick={() => setSelectedCourse(course)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-semibold">{course.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{course.description}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingCourse(course);
                            courseForm.reset({
                              title: course.title,
                              description: course.description || '',
                              thumbnail_url: course.thumbnail_url || '',
                              duration: course.duration || '',
                              total_modules: course.total_modules || 0,
                              total_lessons: course.total_lessons || 0,
                              course_target: course.course_target || 'both',
                            });
                            setDialogOpen(true);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick('course', course.id, course.title);
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {selectedCourse && (
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Módulos e Aulas - {selectedCourse.title}</CardTitle>
                    <div className="flex gap-2">
                      <Dialog 
                        open={moduleDialogOpen} 
                        onOpenChange={(open) => {
                          setModuleDialogOpen(open);
                          if (!open) {
                            setEditingModule(null);
                            moduleForm.reset();
                          }
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline">
                            <Plus className="w-4 h-4 mr-2" />
                            Novo Módulo
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>{editingModule ? 'Editar Módulo' : 'Criar Novo Módulo'}</DialogTitle>
                          </DialogHeader>
                          <Form {...moduleForm}>
                            <form onSubmit={moduleForm.handleSubmit(onSubmitModule)} className="space-y-4">
                              <FormField
                                control={moduleForm.control}
                                name="title"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Título do Módulo</FormLabel>
                                    <FormControl>
                                      <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={moduleForm.control}
                                name="description"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Descrição</FormLabel>
                                    <FormControl>
                                      <Textarea {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <Button type="submit" className="w-full">
                                {editingModule ? 'Atualizar Módulo' : 'Criar Módulo'}
                              </Button>
                            </form>
                          </Form>
                        </DialogContent>
                      </Dialog>
                      <Dialog 
                        open={lessonDialogOpen} 
                        onOpenChange={(open) => {
                          setLessonDialogOpen(open);
                          if (!open) {
                            setEditingLesson(null);
                            lessonForm.reset();
                          }
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button size="sm">
                            <Plus className="w-4 h-4 mr-2" />
                            Nova Aula
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>{editingLesson ? 'Editar Aula' : 'Adicionar Nova Aula'}</DialogTitle>
                          </DialogHeader>
                          <Form {...lessonForm}>
                            <form onSubmit={lessonForm.handleSubmit(onSubmitLesson)} className="space-y-4">
                              <FormField
                                control={lessonForm.control}
                                name="title"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Título</FormLabel>
                                    <FormControl>
                                      <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={lessonForm.control}
                                name="youtube_url"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>URL do Vídeo</FormLabel>
                                    <FormControl>
                                      <Input {...field} placeholder="https://..." />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={lessonForm.control}
                                name="duration_minutes"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Duração (minutos)</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        {...field}
                                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={lessonForm.control}
                                name="module_id"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Módulo (opcional)</FormLabel>
                                    <Select 
                                      onValueChange={field.onChange} 
                                      value={field.value}
                                    >
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue placeholder="Selecione um módulo" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        <SelectItem value="none">Sem módulo</SelectItem>
                                        {modules.map((module) => (
                                          <SelectItem key={module.id} value={module.id}>
                                            {module.title}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <Button type="submit" className="w-full">
                                {editingLesson ? 'Atualizar Aula' : 'Criar Aula'}
                              </Button>
                            </form>
                          </Form>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Módulos com suas aulas */}
                  {modules.map((module) => {
                    const moduleLessons = lessons.filter(l => l.module_id === module.id);
                    return (
                      <div key={module.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="font-semibold text-lg">{module.title}</h4>
                            {module.description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {module.description}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedModuleForQuiz(module);
                                setQuizType('module');
                                quizForm.reset({ 
                                  title: `Prova - ${module.title}`,
                                  passing_score: 70 
                                });
                                setQuizDialogOpen(true);
                              }}
                            >
                              <ClipboardList className="w-4 h-4 mr-2" />
                              Criar Prova
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditingModule(module);
                                moduleForm.reset({
                                  title: module.title,
                                  description: module.description || '',
                                });
                                setModuleDialogOpen(true);
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteClick('module', module.id, module.title)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                        
                        {/* Aulas dentro do módulo */}
                        {moduleLessons.length > 0 && (
                          <div className="space-y-2 mt-3 border-l-2 border-border/50 pl-4">
                            {moduleLessons.map((lesson) => (
                              <div key={lesson.id} className="p-3 bg-muted/50 rounded-md">
                                <div className="flex justify-between items-center gap-4">
                                  <div className="flex-1 min-w-0">
                                    <h5 className="font-medium text-sm truncate">{lesson.title}</h5>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {lesson.duration_minutes} minutos
                                    </p>
                                  </div>
                                  <div className="flex gap-1 shrink-0">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedLessonForQuiz(lesson);
                                        setQuizType('lesson');
                                        quizForm.reset({ 
                                          title: `Prova - ${lesson.title}`,
                                          passing_score: 70 
                                        });
                                        setQuizDialogOpen(true);
                                      }}
                                    >
                                      <ClipboardList className="w-3 h-3 mr-1" />
                                      Prova
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => {
                                      setEditingLesson(lesson);
                                      lessonForm.reset({
                                        title: lesson.title,
                                        youtube_url: lesson.youtube_url,
                                        duration_minutes: lesson.duration_minutes || 0,
                                        module_id: lesson.module_id || 'none',
                                      });
                                      setLessonDialogOpen(true);
                                      }}
                                    >
                                      <Edit className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => handleDeleteClick('lesson', lesson.id, lesson.title)}
                                    >
                                      <Trash2 className="w-3 h-3 text-destructive" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  
                  {/* Aulas sem módulo */}
                  {lessons.filter(l => !l.module_id).length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm text-muted-foreground">Aulas sem módulo</h4>
                      {lessons.filter(l => !l.module_id).map((lesson) => (
                        <div key={lesson.id} className="p-4 border rounded-lg">
                          <div className="flex justify-between items-center gap-4">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium truncate">{lesson.title}</h4>
                              <p className="text-sm text-muted-foreground mt-1">
                                {lesson.duration_minutes} minutos
                              </p>
                            </div>
                            <div className="flex gap-2 shrink-0">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedLessonForQuiz(lesson);
                                  setQuizType('lesson');
                                  quizForm.reset({ 
                                    title: `Prova - ${lesson.title}`,
                                    passing_score: 70 
                                  });
                                  setQuizDialogOpen(true);
                                }}
                              >
                                <ClipboardList className="w-4 h-4 mr-2" />
                                Criar Prova
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                setEditingLesson(lesson);
                                lessonForm.reset({
                                  title: lesson.title,
                                  youtube_url: lesson.youtube_url,
                                  duration_minutes: lesson.duration_minutes || 0,
                                  module_id: lesson.module_id || 'none',
                                });
                                setLessonDialogOpen(true);
                                }}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteClick('lesson', lesson.id, lesson.title)}
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="pt-4 border-t">
                    <Button
                      variant="secondary"
                      className="w-full"
                      onClick={() => {
                        setQuizType('final');
                        quizForm.reset({ 
                          title: `Prova Final - ${selectedCourse.title}`,
                          passing_score: 70 
                        });
                        setQuizDialogOpen(true);
                      }}
                    >
                      <ClipboardList className="w-4 h-4 mr-2" />
                      Criar Prova Final do Curso
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
          
          {/* Quiz Dialog */}
          <Dialog open={quizDialogOpen} onOpenChange={setQuizDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {quizType === 'lesson' && 'Criar Prova de Aula'}
                  {quizType === 'module' && 'Criar Prova de Módulo'}
                  {quizType === 'final' && 'Criar Prova Final'}
                </DialogTitle>
              </DialogHeader>
              <Form {...quizForm}>
                <form onSubmit={quizForm.handleSubmit(onSubmitQuiz)} className="space-y-4">
                  <FormField
                    control={quizForm.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Título da Prova</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={quizForm.control}
                    name="passing_score"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nota Mínima (%)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {quizType === 'lesson' && selectedLessonForQuiz && (
                    <p className="text-sm text-muted-foreground">
                      Vinculado à aula: <strong>{selectedLessonForQuiz.title}</strong>
                    </p>
                  )}
                  {quizType === 'module' && selectedModuleForQuiz && (
                    <p className="text-sm text-muted-foreground">
                      Vinculado ao módulo: <strong>{selectedModuleForQuiz.title}</strong>
                    </p>
                  )}
                  {quizType === 'final' && (
                    <p className="text-sm text-muted-foreground">
                      Esta será a prova final do curso <strong>{selectedCourse?.title}</strong>
                    </p>
                  )}
                  <Button type="submit" className="w-full">
                    Criar Prova
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir {
                  deletingItem?.type === 'course' ? 'o curso' : 
                  deletingItem?.type === 'module' ? 'o módulo' : 
                  'a aula'
                } <strong>{deletingItem?.name}</strong>? Esta ação não pode ser desfeita.
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

export default AdminCourses;
