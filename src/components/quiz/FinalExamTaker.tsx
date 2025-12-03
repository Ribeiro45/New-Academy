import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { CheckCircle2, XCircle, Award, Download } from 'lucide-react';
import { generateCertificatePDF } from '@/components/certificates/CertificateDownload';

interface FinalExamTakerProps {
  courseId: string;
  courseTitle: string;
  onComplete: () => void;
}

export const FinalExamTaker = ({ courseId, courseTitle, onComplete }: FinalExamTakerProps) => {
  const [quiz, setQuiz] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<any[]>([]);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [certificate, setCertificate] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [totalHours, setTotalHours] = useState(0);
  const [loading, setLoading] = useState(true);
  const [attemptCount, setAttemptCount] = useState(0);
  const [maxAttemptsReached, setMaxAttemptsReached] = useState(false);

  useEffect(() => {
    fetchData();
  }, [courseId]);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('full_name, cpf')
      .eq('id', user.id)
      .single();
    setProfile(profileData);

    // Fetch final exam
    const { data: quizData } = await supabase
      .from('quizzes')
      .select('*')
      .eq('course_id', courseId)
      .eq('is_final_exam', true)
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

    // Fetch answers
    const { data: answersData } = await supabase
      .from('quiz_answers')
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

      // Check for certificate
      const { data: certData } = await supabase
        .from('certificates')
        .select('*')
        .eq('user_id', user.id)
        .eq('course_id', courseId)
        .maybeSingle();

      setCertificate(certData);
    } else if (attempts.length >= 2) {
      setMaxAttemptsReached(true);
    }

    // Calculate total hours
    const { data: lessonsData } = await supabase
      .from('lessons')
      .select('duration_minutes')
      .eq('course_id', courseId);

    const total = lessonsData?.reduce((sum, l) => sum + (l.duration_minutes || 0), 0) || 0;
    setTotalHours(Math.round(total / 60));

    setLoading(false);
  };

  const handleSubmit = async () => {
    if (Object.keys(userAnswers).length !== questions.length) {
      toast.error('Por favor, responda todas as questões');
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let correctCount = 0;
    const responses = [];

    // Fetch correct answers from the backend for validation
    const { data: correctAnswersData } = await supabase
      .from('quiz_answers')
      .select('id, question_id, is_correct')
      .in('question_id', questions.map(q => q.id));

    for (const question of questions) {
      const selectedAnswerId = userAnswers[question.id];
      const correctAnswer = correctAnswersData?.find(
        a => a.question_id === question.id && a.is_correct
      );
      const isCorrect = selectedAnswerId === correctAnswer?.id;
      
      if (isCorrect) {
        correctCount++;
      }

      responses.push({
        question_id: question.id,
        answer_id: selectedAnswerId,
        is_correct: isCorrect,
      });
    }

    const score = Math.round((correctCount / questions.length) * 100);
    const passed = score >= quiz.passing_score;

    const { data: attempt, error: attemptError } = await supabase
      .from('user_quiz_attempts')
      .insert({
        user_id: user.id,
        quiz_id: quiz.id,
        score,
        passed,
      })
      .select()
      .single();

    if (attemptError) {
      toast.error('Erro ao salvar tentativa');
      return;
    }

    for (const response of responses) {
      await supabase.from('user_quiz_responses').insert({
        attempt_id: attempt.id,
        ...response,
      });
    }

    setResult({ score, passed, correctCount, total: questions.length });
    setSubmitted(true);
    setAttemptCount(attemptCount + 1);

    if (passed) {
      toast.success('Parabéns! Você passou na prova final!');
      // Trigger certificate generation
      await supabase.rpc('check_and_issue_certificate', {
        p_user_id: user.id,
        p_course_id: courseId
      });
      
      // Fetch the generated certificate
      const { data: certData } = await supabase
        .from('certificates')
        .select('*')
        .eq('user_id', user.id)
        .eq('course_id', courseId)
        .maybeSingle();

      setCertificate(certData);
      setTimeout(() => onComplete(), 2000);
    } else {
      if (attemptCount + 1 >= 2) {
        // Reset course progress
        const { data: lessonsData } = await supabase
          .from('lessons')
          .select('id')
          .eq('course_id', courseId);

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
          // Delete responses first (foreign key constraint)
          await supabase
            .from('user_quiz_responses')
            .delete()
            .in('attempt_id', attemptsToDelete.map(a => a.id));

          // Then delete attempts
          await supabase
            .from('user_quiz_attempts')
            .delete()
            .eq('user_id', user.id)
            .eq('quiz_id', quiz.id);
        }

        setMaxAttemptsReached(true);
        toast.error('Você usou todas as tentativas! O progresso do curso foi resetado.');
      } else {
        toast.error(`Você não atingiu a nota mínima. Você tem mais ${2 - (attemptCount + 1)} tentativa(s).`);
      }
    }
  };

  const handleDownloadCertificate = () => {
    if (!certificate) return;

    generateCertificatePDF({
      courseTitle,
      studentName: profile?.full_name || "Estudante",
      studentCPF: profile?.cpf || "000.000.000-00",
      certificateNumber: certificate.certificate_number,
      issuedAt: certificate.issued_at,
      totalHours,
    });
    toast.success("Download do certificado iniciado!");
  };

  if (loading) {
    return <div className="text-center text-muted-foreground">Carregando prova final...</div>;
  }

  if (!quiz) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Nenhuma prova final disponível para este curso
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
            Você já usou as 2 tentativas permitidas para esta prova. O progresso do curso foi resetado. Refaça todas as aulas e módulos para tentar novamente.
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
                Aprovado na Prova Final!
              </>
            ) : (
              <>
                <XCircle className="w-6 h-6 text-destructive" />
                Reprovado na Prova Final
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
            
            {result.passed && certificate && (
              <div className="pt-4 border-t">
                <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg p-6 text-center space-y-4">
                  <Award className="w-16 h-16 text-primary mx-auto" />
                  <div>
                    <h3 className="text-lg font-semibold mb-1">Certificado Disponível!</h3>
                    <p className="text-sm text-muted-foreground">
                      Parabéns por concluir o curso com sucesso!
                    </p>
                  </div>
                  <Button 
                    onClick={handleDownloadCertificate}
                    className="w-full bg-gradient-to-r from-primary to-accent"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Baixar Certificado
                  </Button>
                </div>
              </div>
            )}

            {!result.passed && attemptCount < 2 && (
              <Button onClick={() => { setSubmitted(false); setUserAnswers({}); }} className="w-full">
                Tentar Novamente ({2 - attemptCount} tentativa(s) restante(s))
              </Button>
            )}
            {!result.passed && attemptCount >= 2 && (
              <p className="text-center text-sm text-muted-foreground">
                Limite de tentativas atingido. O progresso do curso foi resetado.
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
          Esta é a prova final do curso. Você precisa de {quiz.passing_score}% para ser aprovado.
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
        <Button onClick={handleSubmit} className="w-full">
          Enviar Respostas
        </Button>
      </CardContent>
    </Card>
  );
};