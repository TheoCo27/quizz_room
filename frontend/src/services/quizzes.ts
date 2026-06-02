import { apiRequest } from "./api";

export type QuizQuestion = {
  id: number;
  questionText: string;
  answers: string[];
  correctAnswer: string;
  position: number;
  points: number;
  createdAt: string;
};

export type Quiz = {
  id: number;
  title: string;
  questionDurationSec: number | null;
  createdAt: string;
  questions: QuizQuestion[];
};

export type CreateQuizPayload = {
  title: string;
  questionDurationSec?: 0 | 10 | 30 | null;
  questions: Array<{
    questionText: string;
    answers: string[];
    correctAnswerIndex: number;
    points?: number;
  }>;
};

export function getQuizzes(): Promise<Quiz[]> {
  return apiRequest<Quiz[]>("/quizzes");
}

export function getQuizById(quizId: number): Promise<Quiz> {
  return apiRequest<Quiz>(`/quizzes/${quizId}`);
}

export function createQuiz(payload: CreateQuizPayload): Promise<Quiz> {
  return apiRequest<Quiz>("/quizzes", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getMyQuizzes(): Promise<Quiz[]> {
  return apiRequest<Quiz[]>("/quizzes/me");
}

export function updateQuiz(quizId: number, payload: CreateQuizPayload): Promise<Quiz> {
  return apiRequest<Quiz>(`/quizzes/${quizId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteQuiz(quizId: number): Promise<void> {
  return apiRequest<void>(`/quizzes/${quizId}`, {
    method: "DELETE",
  });
}
