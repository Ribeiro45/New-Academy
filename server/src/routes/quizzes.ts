import { Router, Response } from 'express';
import prisma from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { isAdmin, isEditor } from '../middleware/roles';

const router = Router();

// Get quiz by ID
router.get('/:id', async (req, res: Response) => {
  try {
    const { id } = req.params;

    const quiz = await prisma.quiz.findUnique({
      where: { id },
      include: {
        questions: {
          orderBy: { orderIndex: 'asc' },
          include: {
            answers: true,
          },
        },
      },
    });

    if (!quiz) {
      res.status(404).json({ error: 'Quiz not found' });
      return;
    }

    // Remove is_correct from answers for non-admin users
    const sanitizedQuiz = {
      ...quiz,
      questions: quiz.questions.map(q => ({
        ...q,
        answers: q.answers.map(a => ({
          id: a.id,
          answer: a.answer,
          questionId: a.questionId,
        })),
      })),
    };

    res.json(sanitizedQuiz);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get quiz' });
  }
});

// Get quiz by module
router.get('/module/:moduleId', async (req, res: Response) => {
  try {
    const { moduleId } = req.params;

    const quiz = await prisma.quiz.findFirst({
      where: { moduleId, isFinalExam: false },
      include: {
        questions: {
          orderBy: { orderIndex: 'asc' },
          include: {
            answers: true,
          },
        },
      },
    });

    if (!quiz) {
      res.status(404).json({ error: 'Quiz not found' });
      return;
    }

    // Remove is_correct from answers for security
    const sanitizedQuiz = {
      ...quiz,
      questions: quiz.questions.map(q => ({
        ...q,
        answers: q.answers.map(a => ({
          id: a.id,
          answer: a.answer,
          questionId: a.questionId,
        })),
      })),
    };

    res.json(sanitizedQuiz);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get quiz' });
  }
});

// Get final exam by course
router.get('/course/:courseId/final', async (req, res: Response) => {
  try {
    const { courseId } = req.params;

    const quiz = await prisma.quiz.findFirst({
      where: { courseId, isFinalExam: true },
      include: {
        questions: {
          orderBy: { orderIndex: 'asc' },
          include: {
            answers: true,
          },
        },
      },
    });

    if (!quiz) {
      res.status(404).json({ error: 'Final exam not found' });
      return;
    }

    // Remove is_correct from answers for security
    const sanitizedQuiz = {
      ...quiz,
      questions: quiz.questions.map(q => ({
        ...q,
        answers: q.answers.map(a => ({
          id: a.id,
          answer: a.answer,
          questionId: a.questionId,
        })),
      })),
    };

    res.json(sanitizedQuiz);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get final exam' });
  }
});

// Submit quiz attempt
router.post('/:id/submit', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { responses } = req.body; // Array of { questionId, answerId }

    const quiz = await prisma.quiz.findUnique({
      where: { id },
      include: {
        questions: {
          include: {
            answers: true,
          },
        },
      },
    });

    if (!quiz) {
      res.status(404).json({ error: 'Quiz not found' });
      return;
    }

    // Calculate score
    let correctCount = 0;
    const responseResults = responses.map((r: { questionId: string; answerId: string }) => {
      const question = quiz.questions.find(q => q.id === r.questionId);
      const answer = question?.answers.find(a => a.id === r.answerId);
      const isCorrect = answer?.isCorrect || false;
      if (isCorrect) correctCount++;
      return {
        questionId: r.questionId,
        answerId: r.answerId,
        isCorrect,
      };
    });

    const score = Math.round((correctCount / quiz.questions.length) * 100);
    const passed = score >= quiz.passingScore;

    // Create attempt
    const attempt = await prisma.userQuizAttempt.create({
      data: {
        userId: req.userId!,
        quizId: id,
        score,
        passed,
        responses: {
          create: responseResults,
        },
      },
      include: {
        responses: true,
      },
    });

    res.json({
      attempt,
      score,
      passed,
      correctCount,
      totalQuestions: quiz.questions.length,
    });
  } catch (error) {
    console.error('Submit quiz error:', error);
    res.status(500).json({ error: 'Failed to submit quiz' });
  }
});

// Get user attempts for a quiz
router.get('/:id/attempts', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const attempts = await prisma.userQuizAttempt.findMany({
      where: {
        quizId: id,
        userId: req.userId,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(attempts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get attempts' });
  }
});

// Create quiz (admin/editor only)
router.post('/', authenticate, isEditor, async (req: AuthRequest, res: Response) => {
  try {
    const { title, courseId, moduleId, lessonId, passingScore, isFinalExam, questions } = req.body;

    const quiz = await prisma.quiz.create({
      data: {
        title,
        courseId,
        moduleId,
        lessonId,
        passingScore: passingScore || 70,
        isFinalExam: isFinalExam || false,
        questions: questions ? {
          create: questions.map((q: any, index: number) => ({
            question: q.question,
            orderIndex: index,
            answers: {
              create: q.answers.map((a: any) => ({
                answer: a.answer,
                isCorrect: a.isCorrect || false,
              })),
            },
          })),
        } : undefined,
      },
      include: {
        questions: {
          include: {
            answers: true,
          },
        },
      },
    });

    res.status(201).json(quiz);
  } catch (error) {
    console.error('Create quiz error:', error);
    res.status(500).json({ error: 'Failed to create quiz' });
  }
});

// Update quiz (admin/editor only)
router.put('/:id', authenticate, isEditor, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title, passingScore, isFinalExam } = req.body;

    const quiz = await prisma.quiz.update({
      where: { id },
      data: {
        title,
        passingScore,
        isFinalExam,
      },
    });

    res.json(quiz);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update quiz' });
  }
});

// Delete quiz (admin/editor only)
router.delete('/:id', authenticate, isEditor, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.quiz.delete({
      where: { id },
    });

    res.json({ message: 'Quiz deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete quiz' });
  }
});

// Add question to quiz
router.post('/:id/questions', authenticate, isEditor, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { question, orderIndex, answers } = req.body;

    const newQuestion = await prisma.quizQuestion.create({
      data: {
        quizId: id,
        question,
        orderIndex,
        answers: {
          create: answers.map((a: any) => ({
            answer: a.answer,
            isCorrect: a.isCorrect || false,
          })),
        },
      },
      include: {
        answers: true,
      },
    });

    res.status(201).json(newQuestion);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add question' });
  }
});

// Update question
router.put('/questions/:questionId', authenticate, isEditor, async (req: AuthRequest, res: Response) => {
  try {
    const { questionId } = req.params;
    const { question, orderIndex } = req.body;

    const updated = await prisma.quizQuestion.update({
      where: { id: questionId },
      data: {
        question,
        orderIndex,
      },
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update question' });
  }
});

// Delete question
router.delete('/questions/:questionId', authenticate, isEditor, async (req: AuthRequest, res: Response) => {
  try {
    const { questionId } = req.params;

    await prisma.quizQuestion.delete({
      where: { id: questionId },
    });

    res.json({ message: 'Question deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete question' });
  }
});

// Update answer
router.put('/answers/:answerId', authenticate, isEditor, async (req: AuthRequest, res: Response) => {
  try {
    const { answerId } = req.params;
    const { answer, isCorrect } = req.body;

    const updated = await prisma.quizAnswer.update({
      where: { id: answerId },
      data: {
        answer,
        isCorrect,
      },
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update answer' });
  }
});

export default router;
