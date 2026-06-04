// Ce fichier contient la logique metier de creation et lecture des quiz.
import {
  assertSafeTextInput,
  QUIZ_ANSWER_MAX_LENGTH,
  QUIZ_QUESTION_MAX_LENGTH,
  QUIZ_TITLE_MAX_LENGTH,
} from "@/common/validation/input-safety";
import { PrismaService } from "@/prisma/prisma.service";
import { Prisma } from "@generated/prisma/client";
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CreateQuizDto } from "./dto/create-quiz.dto";

type QuizQuestionResponse = {
  id: number;
  questionText: string;
  answers: string[];
  correctAnswer: string;
  position: number;
  points: number;
  createdAt: string;
};

export type QuizResponse = {
  id: number;
  title: string;
  questionDurationSec: number | null;
  createdAt: string;
  authorId?: number | null;
  author?: {
    id: number;
    username: string;
  } | null;
  questions: QuizQuestionResponse[];
};

type QuizWithQuestions = {
  id: number;
  title: string;
  questionDurationSec: number | null;
  createdAt: Date;
  authorId: number | null;
  author?: {
    id: number;
    username: string;
  } | null;
  questions: Array<{
    id: number;
    questionText: string;
    answers: Prisma.JsonValue;
    correctAnswer: string;
    position: number;
    points: number;
    createdAt: Date;
  }>;
};


@Injectable()
export class QuizzesService {
  constructor(private readonly prisma: PrismaService) {}

  // Cree un quiz et ses questions en base.
  async createQuiz(dto: CreateQuizDto, authorId?: number): Promise<QuizResponse> {
    this.assertValidQuestions(dto);

    const quiz = (await this.prisma.client.quiz.create({
      data: {
        title: dto.title.trim(),
        questionDurationSec: dto.questionDurationSec ?? null,
        authorId,
        questions: {
          create: dto.questions.map((question, index) => {
            const answers = question.answers.map((answer) => answer.trim());

            return {
              questionText: question.questionText.trim(),
              answers,
              correctAnswer: answers[question.correctAnswerIndex],
              position: index + 1,
              ...(typeof question.points === "number"
                ? { points: question.points }
                : {}),
            };
          }),
        },
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
          },
        },
        questions: {
          orderBy: {
            position: "asc",
          },
        },
      },
    })) as QuizWithQuestions;

    return this.toQuizResponse(quiz);
  }

  // Retourne tous les quiz tries du plus recent au plus ancien.
  async listQuizzes(): Promise<QuizResponse[]> {
    const quizzes = (await this.prisma.client.quiz.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
          },
        },
        questions: {
          orderBy: {
            position: "asc",
          },
        },
      },
    })) as QuizWithQuestions[];

    return quizzes.map((quiz) => this.toQuizResponse(quiz));
  }

  // Retourne les quiz crees par un utilisateur specifique.
  async listMyQuizzes(authorId: number): Promise<QuizResponse[]> {
    const quizzes = (await this.prisma.client.quiz.findMany({
      where: { authorId },
      orderBy: { createdAt: "desc" },
      include: {
        author: {
          select: {
            id: true,
            username: true,
          },
        },
        questions: { orderBy: { position: "asc" } },
      },
    })) as QuizWithQuestions[];
    
    return quizzes.map((quiz) => this.toQuizResponse(quiz));
  }

  // Met a jour un quiz existant.
  async updateQuiz(quizId: number, authorId: number, dto: CreateQuizDto): Promise<QuizResponse> {
    const quiz = await this.prisma.client.quiz.findUnique({ where: { id: quizId } });
    if (!quiz) throw new NotFoundException(`Quiz ${quizId} not found`);
    if (quiz.authorId !== authorId) throw new BadRequestException("You can only update your own quizzes");
    
    this.assertValidQuestions(dto);

    const updatedQuiz = (await this.prisma.client.quiz.update({
      where: { id: quizId },
      data: {
        title: dto.title.trim(),
        questionDurationSec: dto.questionDurationSec ?? null,
        questions: {
          deleteMany: {},
          create: dto.questions.map((question, index) => {
            const answers = question.answers.map((answer) => answer.trim());
            return {
              questionText: question.questionText.trim(),
              answers,
              correctAnswer: answers[question.correctAnswerIndex],
              position: index + 1,
              ...(typeof question.points === "number" ? { points: question.points } : {}),
            };
          }),
        },
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
          },
        },
        questions: { orderBy: { position: "asc" } },
      },
    })) as QuizWithQuestions;

    return this.toQuizResponse(updatedQuiz);
  }

  // Supprime un quiz.
  async deleteQuiz(quizId: number, authorId: number): Promise<void> {
    const quiz = await this.prisma.client.quiz.findUnique({ where: { id: quizId } });
    if (!quiz) throw new NotFoundException(`Quiz ${quizId} not found`);
    if (quiz.authorId !== authorId) throw new BadRequestException("You can only delete your own quizzes");

    try {
      await this.prisma.client.$transaction([
        this.prisma.client.quizQuestion.deleteMany({ where: { quizId } }),
        this.prisma.client.quizLeaderboard.deleteMany({ where: { quizId } }),
        this.prisma.client.quiz.delete({ where: { id: quizId } }),
      ]);
    } catch (error) {
      throw new BadRequestException("Cannot delete this quiz, it might be in use.");
    }
  }

  // Recupere un quiz complet par son identifiant.
  async getQuizById(quizId: number): Promise<QuizResponse> {
    const quiz = (await this.prisma.client.quiz.findUnique({
      where: { id: quizId },
      include: {
        author: {
          select: {
            id: true,
            username: true,
          },
        },
        questions: {
          orderBy: {
            position: "asc",
          },
        },
      },
    })) as QuizWithQuestions | null;

    if (!quiz) {
      throw new NotFoundException(`Quiz ${quizId} not found`);
    }

    return this.toQuizResponse(quiz);
  }

  // Verifie la coherence des bonnes reponses declarees.
  private assertValidQuestions(dto: CreateQuizDto): void {
    const normalizedTitle = dto.title.trim();

    if (normalizedTitle.length < 2 || normalizedTitle.length > QUIZ_TITLE_MAX_LENGTH) {
      throw new BadRequestException("Le titre du quiz a un format invalide");
    }

    assertSafeTextInput(normalizedTitle, "Le titre du quiz");

    dto.questions.forEach((question, index) => {
      const normalizedQuestionText = question.questionText.trim();

      if (
        normalizedQuestionText.length < 1 ||
        normalizedQuestionText.length > QUIZ_QUESTION_MAX_LENGTH
      ) {
        throw new BadRequestException(
          `La question ${index + 1} a un format invalide`,
        );
      }

      assertSafeTextInput(normalizedQuestionText, `La question ${index + 1}`);

      if (question.correctAnswerIndex >= question.answers.length) {
        throw new BadRequestException(
          `Question ${index + 1} has an invalid correctAnswerIndex`,
        );
      }

      const normalizedAnswers = question.answers.map((answer) => answer.trim());
      const uniqueAnswers = new Set(
        normalizedAnswers.map((answer) => answer.toLocaleLowerCase("fr-FR")),
      );

      if (uniqueAnswers.size !== normalizedAnswers.length) {
        throw new BadRequestException(
          `Les reponses de la question ${index + 1} doivent etre uniques`,
        );
      }

      normalizedAnswers.forEach((answer, answerIndex) => {
        if (answer.length < 1 || answer.length > QUIZ_ANSWER_MAX_LENGTH) {
          throw new BadRequestException(
            `La reponse ${answerIndex + 1} de la question ${index + 1} a un format invalide`,
          );
        }

        assertSafeTextInput(
          answer,
          `La reponse ${answerIndex + 1} de la question ${index + 1}`,
        );
      });
    });
  }

  // Convertit un quiz Prisma vers le format expose par l'API.
  private toQuizResponse(quiz: QuizWithQuestions): QuizResponse {
    return {
      id: quiz.id,
      title: quiz.title,
      questionDurationSec: quiz.questionDurationSec,
      createdAt: quiz.createdAt.toISOString(),
      authorId: quiz.authorId,
      author: quiz.author ? { id: quiz.author.id, username: quiz.author.username } : null,
      questions: quiz.questions.map((question) => ({
        id: question.id,
        questionText: question.questionText,
        answers: this.parseAnswers(question.answers),
        correctAnswer: question.correctAnswer,
        position: question.position,
        points: question.points,
        createdAt: question.createdAt.toISOString(),
      })),
    };
  }

  // Convertit les reponses JSON stockees en tableau de chaines.
  private parseAnswers(value: Prisma.JsonValue): string[] {
    if (
      Array.isArray(value) &&
      value.every((entry) => typeof entry === "string")
    ) {
      return [...value];
    }

    throw new BadRequestException(
      "Quiz answers are not stored in the expected format",
    );
  }
}
