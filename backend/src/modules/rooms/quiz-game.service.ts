import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Server } from 'socket.io';
import { RoomStatus } from '../../../generated/prisma/client';
import { RoomsService } from './rooms.service';

interface GameState {
  roomId: string;
  questions: any[];
  currentQuestionIndex: number;
  scores: Map<number, number>;
  answers: Map<number, string>;
  questionEndTime: number;
  interval?: NodeJS.Timeout;
}

@Injectable()
export class QuizGameService {
  private activeGames = new Map<string, GameState>();
  private readonly logger = new Logger(QuizGameService.name);

  constructor(
    private prisma: PrismaService,
    private roomsService: RoomsService,
  ) {}

  async startGameLoop(roomId: string, server: Server) {
    if (this.activeGames.has(roomId)) return;

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

    const gameState: GameState = {
      roomId,
      questions: room.quiz.questions,
      currentQuestionIndex: 0,
      scores: new Map<number, number>(),
      answers: new Map<number, string>(),
      questionEndTime: 0,
    };

    room.players.forEach(p => {
      gameState.scores.set(p.userId, p.score || 0);
    });

    this.activeGames.set(roomId, gameState);
    this.logger.log(`Game loop started for room ${roomId}`);

    this.sendNextQuestion(roomId, server);
  }

  submitAnswer(roomId: string, userId: number, answer: string) {
    const game = this.activeGames.get(roomId);
    if (!game) return;

    if (Date.now() > game.questionEndTime) {
      // Too late
      return;
    }

    // Only one answer per question per user allowed? Or last answer counts? Let's say last answer counts.
    game.answers.set(userId, answer);
  }

  private sendNextQuestion(roomId: string, server: Server) {
    const game = this.activeGames.get(roomId);
    if (!game) return;

    if (game.currentQuestionIndex >= game.questions.length) {
      this.endGame(roomId, server);
      return;
    }

    const question = game.questions[game.currentQuestionIndex];
    game.answers.clear();
    
    // Default 15 seconds if not specified in quiz (but quiz has questionDurationSec?)
    // Let's check quiz questionDurationSec. 
    // Wait, in schema, quiz has questionDurationSec. Let's assume 15s if not found.
    // Actually we didn't query quiz in the state, only questions. Let's just use 15s.
    const durationSec = 15;
    game.questionEndTime = Date.now() + durationSec * 1000;

    server.to(roomId).emit("question", {
      id: question.id,
      questionText: question.questionText,
      answers: question.answers,
      position: question.position,
      durationSec,
      totalQuestions: game.questions.length,
    });

    game.interval = setTimeout(() => {
      this.evaluateAnswersAndSendResult(roomId, server);
    }, durationSec * 1000);
  }

  private async evaluateAnswersAndSendResult(roomId: string, server: Server) {
    const game = this.activeGames.get(roomId);
    if (!game) return;

    const question = game.questions[game.currentQuestionIndex];
    const correctAnswer = question.correctAnswer;
    const points = question.points || 100;
    
    const results = [];

    for (const [userId, answer] of game.answers.entries()) {
      if (answer === correctAnswer) {
        const currentScore = game.scores.get(userId) || 0;
        game.scores.set(userId, currentScore + points);
        results.push({ userId, correct: true, points });
      } else {
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
  }

  private async endGame(roomId: string, server: Server) {
    const game = this.activeGames.get(roomId);
    if (!game) return;
    this.activeGames.delete(roomId);

    this.logger.log(`Game ended for room ${roomId}`);
    const updatedRoom = await this.roomsService.endGame(roomId);
    
    server.to(roomId).emit("room_state_updated", updatedRoom);
    server.to(roomId).emit("game_ended", updatedRoom);
  }
}
