import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GradeQuizRequest {
  quizId: string;
  answers: Record<string, string>; // questionId -> answerId
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Get the authorization header to identify the user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create admin client to access correct answers
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Create user client to verify authentication
    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get current user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Grading quiz for user: ${user.id}`);

    const { quizId, answers }: GradeQuizRequest = await req.json();

    if (!quizId || !answers || Object.keys(answers).length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing quizId or answers' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch quiz details
    const { data: quiz, error: quizError } = await supabaseAdmin
      .from('quizzes')
      .select('id, passing_score, course_id, module_id, lesson_id, is_final_exam')
      .eq('id', quizId)
      .single();

    if (quizError || !quiz) {
      console.error('Quiz fetch error:', quizError);
      return new Response(
        JSON.stringify({ error: 'Quiz not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch questions for this quiz
    const { data: questions, error: questionsError } = await supabaseAdmin
      .from('quiz_questions')
      .select('id')
      .eq('quiz_id', quizId);

    if (questionsError || !questions) {
      console.error('Questions fetch error:', questionsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch questions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate that user answered all questions
    const questionIds = questions.map(q => q.id);
    const answeredQuestionIds = Object.keys(answers);
    
    if (questionIds.length !== answeredQuestionIds.length) {
      return new Response(
        JSON.stringify({ error: 'Please answer all questions' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch correct answers (ONLY on the server - never exposed to client)
    const { data: correctAnswers, error: answersError } = await supabaseAdmin
      .from('quiz_answers')
      .select('id, question_id, is_correct')
      .in('question_id', questionIds)
      .eq('is_correct', true);

    if (answersError) {
      console.error('Answers fetch error:', answersError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch answers' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Grade the quiz
    let correctCount = 0;
    const responses: Array<{
      question_id: string;
      answer_id: string;
      is_correct: boolean;
    }> = [];

    for (const questionId of questionIds) {
      const selectedAnswerId = answers[questionId];
      const correctAnswer = correctAnswers?.find(a => a.question_id === questionId);
      const isCorrect = selectedAnswerId === correctAnswer?.id;
      
      if (isCorrect) {
        correctCount++;
      }

      responses.push({
        question_id: questionId,
        answer_id: selectedAnswerId,
        is_correct: isCorrect,
      });
    }

    const score = Math.round((correctCount / questions.length) * 100);
    const passed = score >= quiz.passing_score;

    console.log(`Quiz ${quizId} graded: score=${score}, passed=${passed}`);

    // Insert attempt
    const { data: attempt, error: attemptError } = await supabaseAdmin
      .from('user_quiz_attempts')
      .insert({
        user_id: user.id,
        quiz_id: quizId,
        score,
        passed,
      })
      .select()
      .single();

    if (attemptError) {
      console.error('Attempt insert error:', attemptError);
      return new Response(
        JSON.stringify({ error: 'Failed to save attempt' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert responses
    const responsesWithAttemptId = responses.map(r => ({
      ...r,
      attempt_id: attempt.id,
    }));

    const { error: responsesError } = await supabaseAdmin
      .from('user_quiz_responses')
      .insert(responsesWithAttemptId);

    if (responsesError) {
      console.error('Responses insert error:', responsesError);
      // Non-fatal error, continue
    }

    // If passed and this is a final exam, issue certificate
    if (passed && quiz.is_final_exam && quiz.course_id) {
      console.log('Attempting to issue certificate for final exam pass');
      try {
        await supabaseAdmin.rpc('check_and_issue_certificate', {
          p_user_id: user.id,
          p_course_id: quiz.course_id
        });
      } catch (certError) {
        console.error('Certificate issuance error:', certError);
        // Non-fatal, continue
      }
    }

    // Get attempt count for user's reference
    const { count: attemptCount } = await supabaseAdmin
      .from('user_quiz_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('quiz_id', quizId);

    return new Response(
      JSON.stringify({
        score,
        passed,
        correctCount,
        totalQuestions: questions.length,
        passingScore: quiz.passing_score,
        attemptCount: attemptCount || 1,
        attemptId: attempt.id,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
