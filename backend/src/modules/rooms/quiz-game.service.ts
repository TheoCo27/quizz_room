import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Server } from 'socket.io';
import { RoomStatus } from '../../../generated/prisma/client';
import { RoomsService } from './rooms.service';
import { MetricsService } from '../metrics/metrics.service';

interface GameState {
  roomId: string;
  questions: any[];
  currentQuestionIndex: number;
  scores: Map<number, number>;
  answers: Map<number, string>;
  questionEndTime: number | null;
  questionDurationSec: number | null;
  interval?: NodeJS.Timeout;
  isEvaluating?: boolean;
}

@Injectable()
export class QuizGameService {
  private activeGames = new Map<string, GameState>();
  private readonly logger = new Logger(QuizGameService.name);
  private server: Server | null = null;

  constructor(
    private prisma: PrismaService,
    private roomsService: RoomsService,
    private metricsService: MetricsService,
  ) {}

  async startGameLoop(roomId: string, server: Server) {
    if (this.activeGames.has(roomId)) return;

    this.server = server;

    const room = await this.prisma.client.room.findUnique({
      where: { id: roomId },
      include: {
        players: true,
        quiz: {
          include: {
            questions: {
              orderBy: { position: 'asc' },
            },
          },
        },
      },
    });

    if (!room || !room.quiz) {
      this.logger.error(`Cannot start game for room ${roomId}: no quiz or room found.`);
      return;
    }

    const questionDurationSec =
      room.quiz.questionDurationSec === null || room.quiz.questionDurationSec === 0
        ? null
        : room.quiz.questionDurationSec && room.quiz.questionDurationSec > 0
          ? room.quiz.questionDurationSec
          : 10;

    const gameState: GameState = {
      roomId,
      questions: room.quiz.questions,
      currentQuestionIndex: 0,
      scores: new Map<number, number>(),
      answers: new Map<number, string>(),
      questionEndTime: null,
      questionDurationSec,
    };

    room.players.forEach(p => {
      gameState.scores.set(p.userId, p.score || 0);
    });

    this.activeGames.set(roomId, gameState);
    this.logger.log(`Game loop started for room ${roomId}`);

    this.sendNextQuestion(roomId, server);
  }

  async submitAnswer(roomId: string, userId: number, answer: string) {
    const game = this.activeGames.get(roomId);
    if (!game) return;

    if (game.questionEndTime !== null && Date.now() > game.questionEndTime) {
      // Too late
      return;
    }

    // Only one answer per question per user allowed? Or last answer counts? Let's say last answer counts.
    game.answers.set(userId, answer);

    // Only accepted answers (not too late etc)
    this.metricsService.incrementQuizAnswersSubmitted();

    if (game.questionDurationSec === null) {
      if (game.isEvaluating || !this.server) return;

      const room = await this.prisma.client.room.findUnique({
        where: { id: roomId },
        include: { players: true },
      });

      if (!room) return;

      const connectedPlayers = room.players.filter((player) => player.isConnected);
      if (connectedPlayers.length === 0) return;

      const allAnswered = connectedPlayers.every((player) =>
        game.answers.has(player.userId),
      );

      if (allAnswered) {
        game.isEvaluating = true;
        try {
          await this.evaluateAnswersAndSendResult(roomId, this.server);
        } finally {
          game.isEvaluating = false;
        }
      }
    }
  }

  private async sendNextQuestion(roomId: string, server: Server) {
    const game = this.activeGames.get(roomId);
    if (!game) return;

    const roomExists = await this.prisma.client.room.findUnique({
      where: { id: roomId },
    });
    if (!roomExists) {
      this.logger.log(`Room ${roomId} was deleted. Stopping game loop.`);
      if (game.interval) clearTimeout(game.interval);
      this.activeGames.delete(roomId);
      return;
    }

    if (game.currentQuestionIndex >= game.questions.length) {
      this.endGame(roomId, server);
      return;
    }

    const question = game.questions[game.currentQuestionIndex];
    game.answers.clear();
    
    const durationSec = game.questionDurationSec;
    game.questionEndTime = durationSec ? Date.now() + durationSec * 1000 : null;

    server.to(roomId).emit("question", {
      id: question.id,
      questionText: question.questionText,
      answers: question.answers,
      position: question.position,
      durationSec: durationSec ?? null,
      totalQuestions: game.questions.length,
    });

    if (durationSec) {
      game.interval = setTimeout(() => {
        this.evaluateAnswersAndSendResult(roomId, server);
      }, durationSec * 1000);
    }
  }

  private async evaluateAnswersAndSendResult(roomId: string, server: Server) {
    const game = this.activeGames.get(roomId);
    if (!game) return;

    const roomExists = await this.prisma.client.room.findUnique({
      where: { id: roomId },
    });
    if (!roomExists) {
      this.logger.log(`Room ${roomId} was deleted. Stopping game loop.`);
      if (game.interval) clearTimeout(game.interval);
      this.activeGames.delete(roomId);
      return;
    }

    const question = game.questions[game.currentQuestionIndex];
    const correctAnswer = question.correctAnswer;
    const points = question.points || 100;
    
    const results = [];

    for (const [userId, answer] of game.answers.entries()) {
      if (answer === correctAnswer) {

        this.metricsService.incrementCorrectAnswers();
        
        const currentScore = game.scores.get(userId) || 0;
        game.scores.set(userId, currentScore + points);
        results.push({ userId, correct: true, points });

        await this.prisma.client.user.update({
          where: { id: userId },
          data: {
            xp: {
              increment: 100,
            },
          },
        });
      } else {

        this.metricsService.incrementIncorrectAnswers();

        results.push({ userId, correct: false, points: 0 });
      }
    }

    // Map scores to array for frontend
    const scoreBoard = Array.from(game.scores.entries()).map(([userId, score]) => ({ userId, score }));

    server.to(roomId).emit("question_result", {
      correctAnswer,
      results,
      scores: scoreBoard,
    });

    // Save scores to DB
    for (const [userId, score] of game.scores.entries()) {
      await this.prisma.client.roomPlayer.update({
        where: { roomId_userId: { roomId, userId } },
        data: { score },
      });
    }

    game.currentQuestionIndex++;

    // Wait 5 seconds before next question
    setTimeout(() => {
      this.sendNextQuestion(roomId, server);
    }, 5000);

    game.isEvaluating = false;
  }

  private async endGame(roomId: string, server: Server) {
    const game = this.activeGames.get(roomId);
    if (!game) return;
    this.activeGames.delete(roomId);

    this.logger.log(`Game ended for room ${roomId}`);
    const updatedRoom = await this.roomsService.endGame(roomId);
    
    if (updatedRoom) {
      server.to(roomId).emit("room_state_updated", updatedRoom);
      server.to(roomId).emit("game_ended", updatedRoom);
    } else {
      server.to(roomId).emit("room_closed");
    }
  }

  getActiveGameQuestion(roomId: string, userId: number) {
    const game = this.activeGames.get(roomId);
    if (!game) return null;

    if (game.currentQuestionIndex >= game.questions.length) {
      return null;
    }

    const question = game.questions[game.currentQuestionIndex];
    const durationSec = game.questionDurationSec;
    const timeLeft = game.questionEndTime ? Math.max(0, Math.round((game.questionEndTime - Date.now()) / 1000)) : null;

    const submittedAnswer = game.answers.get(userId) ?? null;

    return {
      id: question.id,
      questionText: question.questionText,
      answers: question.answers,
      position: question.position,
      durationSec: durationSec ?? null,
      timeLeft,
      totalQuestions: game.questions.length,
      submittedAnswer,
    };
  }
}
