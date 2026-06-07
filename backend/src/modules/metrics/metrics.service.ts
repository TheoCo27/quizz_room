import { Injectable } from '@nestjs/common';
import { Counter, Gauge } from 'prom-client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MetricsService {

  constructor(private readonly prisma: PrismaService) {}

  private readonly roomsCreatedTotal = new Counter({
    name: 'rooms_created_total',
    help: 'Total number of rooms created',
  });

  private readonly roomsDeletedTotal = new Counter({
    name: 'rooms_deleted_total',
    help: 'Total number of rooms deleted',
  });

  private readonly quizGamesStartedTotal = new Counter({
    name: 'quiz_games_started_total',
    help: 'Total number of quiz games started',
  });

  private readonly quizGamesFinishedTotal = new Counter({
    name: 'quiz_games_finished_total',
    help: 'Total number of quiz games finished',
  });

  private readonly quizAnswersSubmittedTotal = new Counter({
    name: 'quiz_answers_submitted_total',
    help: 'Total number of quiz answers submitted',
  });

  private readonly activeRooms = new Gauge({
    name: 'active_rooms',
    help: 'Current number of active rooms',
  });

  private websocketConnectionsCount = 0;

  private readonly activeWebsocketConnections = new Gauge({
    name: 'active_websocket_connections',
    help: 'Current number of active WebSocket connections',
  });

  private readonly activeGames = new Gauge({
  name: 'quiz_games_active',
  help: 'Current number of active quiz games',
  });

  private readonly correctAnswersTotal = new Counter({
  name: 'quiz_answers_correct_total',
  help: 'Total number of correct quiz answers',
  });

  private readonly incorrectAnswersTotal = new Counter({
  name: 'quiz_answers_incorrect_total',
  help: 'Total number of incorrect quiz answers',
  });

  private readonly onlineUsers = new Gauge({
  name: 'online_users',
  help: 'Current number of users marked as online in database',
  });

  incrementRoomsCreated(): void {
    this.roomsCreatedTotal.inc();
  }

  incrementRoomsDeleted(): void {
    this.roomsDeletedTotal.inc();
  }

  incrementQuizGamesStarted(): void {
    this.quizGamesStartedTotal.inc();
  }

  incrementQuizGamesFinished(): void {
    this.quizGamesFinishedTotal.inc();
  }

  incrementQuizAnswersSubmitted(): void {
    this.quizAnswersSubmittedTotal.inc();
  }

  incrementActiveRooms(): void {
    this.activeRooms.inc();
  }

  decrementActiveRooms(): void {
    this.activeRooms.dec();
  }

  setActiveRooms(value: number): void {
    this.activeRooms.set(value);
  }

  incrementWebsocketConnections(): void {
    this.websocketConnectionsCount++;
    this.activeWebsocketConnections.set(this.websocketConnectionsCount);
  }

  decrementWebsocketConnections(): void {
    if (this.websocketConnectionsCount > 0) {
      this.websocketConnectionsCount--;
    }

    this.activeWebsocketConnections.set(this.websocketConnectionsCount);
  }

  setWebsocketConnections(value: number): void {
    this.websocketConnectionsCount = Math.max(0, value);
    this.activeWebsocketConnections.set(this.websocketConnectionsCount);
  }

  incrementActiveGames(): void {
    this.activeGames.inc();
  }

  decrementActiveGames(): void {
    this.activeGames.dec();
  }

  incrementCorrectAnswers(): void {
    this.correctAnswersTotal.inc();
  }

  incrementIncorrectAnswers(): void {
    this.incorrectAnswersTotal.inc();
  }

  setOnlineUsers(value: number): void {
  this.onlineUsers.set(Math.max(0, value));
  }

  async updateOnlineUsers(): Promise<void> {
    const count = await this.prisma.client.user.count({
      where: {
        status: 'online',
      },
    });

    this.setOnlineUsers(count);
  }
}
