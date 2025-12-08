import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { CheckCircle2, XCircle } from 'lucide-react';

interface ModuleQuizTakerProps {
  moduleId: string;
  onComplete: () => void;
}

export const ModuleQuizTaker = ({ moduleId, onComplete }: ModuleQuizTakerProps) => {
  const [quiz, setQuiz] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<any[]>([]);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [attemptCount, setAttemptCount] = useState(0);
  const [maxAttemptsReached, setMaxAttemptsReached] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchQuiz();
  }, [moduleId]);

  const fetchQuiz = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch module quiz
    const { data: quizData } = await supabase
      .from('quizzes')
      .select('*')
      .eq('module_id', moduleId)
      .maybeSingle();

    if (!quizData) {
      setLoading(false);
      return;
    }

    setQuiz(quizData);

    // Fetch questions
    const { data: questionsData } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('quiz_id', quizData.id)
      .order('order_index', { ascending: true });

    setQuestions(questionsData || []);

    // Fetch answers from the secure view (without is_correct)
    const { data: answersData } = await supabase
      .from('quiz_answer_options')
      .select('*')
      .in('question_id', (questionsData || []).map(q => q.id));

    setAnswers(answersData || []);

    // Count previous attempts
    const { data: attemptsData } = await supabase
      .from('user_quiz_attempts')
      .select('*')
      .eq('user_id', user.id)
      .eq('quiz_id', quizData.id);

    const attempts = attemptsData || [];
    setAttemptCount(attempts.length);

    // Check if already passed
    const passedAttempt = attempts.find(a => a.passed);
    if (passedAttempt) {
      setResult({
        score: passedAttempt.score,
        passed: true,
        correctCount: Math.round((passedAttempt.score / 100) * (questionsData?.length || 0)),
        total: questionsData?.length || 0
      });
      setSubmitted(true);
    } else if (attempts.length >= 2) {
      setMaxAttemptsReached(true);
    }

    setLoading(false);
  };

  const handleSubmit = async () => {
    if (Object.keys(userAnswers).length !== questions.length) {
      toast.error('Por favor, responda todas as questões');
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setIsSubmitting(true);

    try {
      // Use the secure Edge Function to grade the quiz
      const { data, error } = await supabase.functions.invoke('grade-quiz', {
        body: {
          quizId: quiz.id,
          answers: userAnswers,
        },
      });

      if (error) {
        console.error('Quiz grading error:', error);
        toast.error('Erro ao processar resposta');
        setIsSubmitting(false);
        return;
      }

      const { score, passed, correctCount, totalQuestions, attemptCount: newAttemptCount } = data;

      setResult({ score, passed, correctCount, total: totalQuestions });
      setSubmitted(true);
      setAttemptCount(newAttemptCount);

      if (passed) {
        toast.success('Parabéns! Você passou na prova do módulo!');
        onComplete();
      } else {
        if (newAttemptCount >= 2) {
          // Reset module progress
          const { data: lessonsData } = await supabase
            .from('lessons')
            .select('id')
            .eq('module_id', moduleId);

          if (lessonsData) {
            await supabase
              .from('user_progress')
              .delete()
              .eq('user_id', user.id)
              .in('lesson_id', lessonsData.map(l => l.id));
          }

          // Delete quiz attempts and responses to allow retaking
          const { data: attemptsToDelete } = await supabase
            .from('user_quiz_attempts')
            .select('id')
            .eq('user_id', user.id)
            .eq('quiz_id', quiz.id);

          if (attemptsToDelete && attemptsToDelete.length > 0) {
            await supabase
              .from('user_quiz_responses')
              .delete()
              .in('attempt_id', attemptsToDelete.map(a => a.id));

            await supabase
              .from('user_quiz_attempts')
              .delete()
              .eq('user_id', user.id)
              .eq('quiz_id', quiz.id);
          }

          setMaxAttemptsReached(true);
          toast.error('Você usou todas as tentativas! O progresso do módulo foi resetado.');
        } else {
          toast.error(`Você não atingiu a nota mínima. Você tem mais ${2 - newAttemptCount} tentativa(s).`);
        }
      }
    } catch (err) {
      console.error('Submit error:', err);
      toast.error('Erro ao enviar respostas');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div className="text-center text-muted-foreground">Carregando prova do módulo...</div>;
  }

  if (!quiz) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Nenhuma prova disponível para este módulo
        </CardContent>
      </Card>
    );
  }

  if (maxAttemptsReached && !result?.passed) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <XCircle className="w-6 h-6 text-destructive" />
            Limite de Tentativas Atingido
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center">
            Você já usou as 2 tentativas permitidas para esta prova. O progresso do módulo foi resetado. Refaça as aulas do módulo para tentar novamente.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (submitted && result) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {result.passed ? (
              <>
                <CheckCircle2 className="w-6 h-6 text-green-500" />
                Aprovado no Módulo!
              </>
            ) : (
              <>
                <XCircle className="w-6 h-6 text-destructive" />
                Reprovado no Módulo
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-5xl font-bold text-primary mb-2">{result.score}%</div>
              <p className="text-muted-foreground">
                {result.correctCount} de {result.total} questões corretas
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Nota mínima: {quiz.passing_score}%
              </p>
            </div>
            {!result.passed && attemptCount < 2 && (
              <Button onClick={() => { setSubmitted(false); setUserAnswers({}); }} className="w-full">
                Tentar Novamente ({2 - attemptCount} tentativa(s) restante(s))
              </Button>
            )}
            {!result.passed && attemptCount >= 2 && (
              <p className="text-center text-sm text-muted-foreground">
                Limite de tentativas atingido. O progresso do módulo foi resetado.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{quiz.title}</CardTitle>
        <p className="text-sm text-muted-foreground">
          Prova do módulo. Você precisa de {quiz.passing_score}% para ser aprovado.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {questions.map((question, index) => (
          <div key={question.id} className="space-y-3">
            <p className="font-medium">
              {index + 1}. {question.question}
            </p>
            <RadioGroup
              value={userAnswers[question.id]}
              onValueChange={(value) => setUserAnswers({ ...userAnswers, [question.id]: value })}
            >
              {answers
                .filter(a => a.question_id === question.id)
                .map((answer) => (
                  <div key={answer.id} className="flex items-center space-x-2">
                    <RadioGroupItem value={answer.id} id={answer.id} />
                    <Label htmlFor={answer.id} className="cursor-pointer">
                      {answer.answer}
                    </Label>
                  </div>
                ))}
            </RadioGroup>
          </div>
        ))}
        <Button onClick={handleSubmit} className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Enviando...' : 'Enviar Respostas'}
        </Button>
      </CardContent>
    </Card>
  );
};
