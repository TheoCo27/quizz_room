// backend/src/modules/rooms/rooms.service.ts
import {
  assertSafeTextInput,
  ROOM_NAME_MAX_LENGTH,
} from "@/common/validation/input-safety";
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GameType, RoomStatus } from '../../../generated/prisma/client';

const EMPTY_ROOM_CLEANUP_DELAY_MS = 15000;

@Injectable()
export class RoomsService {
  private readonly cleanupTimers = new Map<string, NodeJS.Timeout>();

  constructor(private readonly prisma: PrismaService) {}

  async createRoom(hostId: number, gameType: GameType, maxPlayers: number = 5, name?: string, quizId?: number) {
    const normalizedName = this.normalizeRoomName(name);

    return this.prisma.client.room.create({
      data: {
        name: normalizedName,
        hostId,
        gameType,
        status: RoomStatus.WAITING,
        maxPlayers,
        quizId: quizId ?? 1004,
        players: {
          create: {
            userId: hostId,
            isReady: true,
          },
        },
      },
      include: {
        host: { select: { id: true, username: true, avatar_url: true } },
        players: { include: { user: { select: { id: true, username: true, avatar_url: true } } } },
      },
    });
  }

  async getWaitingRooms() {
    return this.prisma.client.room.findMany({
      where: { status: RoomStatus.WAITING },
      include: {
        host: { select: { id: true, username: true, avatar_url: true } },
        _count: { select: { players: true } }
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getRoomById(roomId: string) {
    const room = await this.prisma.client.room.findUnique({
      where: { id: roomId },
      include: {
        host: { select: { id: true, username: true, avatar_url: true } },
        players: { include: { user: { select: { id: true, username: true, avatar_url: true } } } },
      },
    });

    if (!room) {
      throw new NotFoundException(`La room ${roomId} n'existe pas`);
    }
    return room;
  }

  async ensurePlayerInRoom(roomId: string, userId: number) {
    await this.getRoomById(roomId);

    const player = await this.prisma.client.roomPlayer.findUnique({
      where: { roomId_userId: { roomId, userId } },
    });

    if (!player) {
      throw new BadRequestException("Vous n'etes pas dans la salle");
    }

    return player;
  }

  async joinRoom(roomId: string, userId: number) {
    const room = await this.getRoomById(roomId);
    this.cancelEmptyRoomCleanup(roomId);

    const existingPlayer = await this.prisma.client.roomPlayer.findUnique({
      where: { roomId_userId: { roomId, userId } },
    });

    if (room.status !== RoomStatus.WAITING) {
      if (existingPlayer) {
        if (room.status === RoomStatus.PLAYING) {
          // Player is reconnecting
          await this.prisma.client.roomPlayer.update({
            where: { id: existingPlayer.id },
            data: { isConnected: true },
          });
        }

        return this.getRoomById(roomId);
      }

      throw new BadRequestException("La room n'est pas en attente");
    }

    if (room.players.length >= room.maxPlayers) {
      throw new BadRequestException("La limite de joueurs est atteinte");
    }

    if (!existingPlayer) {
      await this.prisma.client.roomPlayer.create({
        data: {
          roomId,
          userId,
          isReady: false,
          isConnected: true,
        },
      });
    } else {
      await this.prisma.client.roomPlayer.update({
        where: { id: existingPlayer.id },
        data: { isConnected: true },
      });
    }

    return this.getRoomById(roomId);
  }

  async leaveRoom(roomId: string, userId: number) {
    try {
      await this.prisma.client.roomPlayer.delete({
        where: { roomId_userId: { roomId, userId } },
      });
    } catch (e) {
      // Ignorer si le joueur n'est pas dans la room
    }

    const room = await this.prisma.client.room.findUnique({
      where: { id: roomId },
      include: { players: true }
    });

    if (!room) return null;

    if (room.players.length === 0) {
      try {
        this.cancelEmptyRoomCleanup(roomId);
        console.log(`[RoomsService] Deleting empty room ${roomId} after user ${userId} left.`);
        await this.prisma.client.room.delete({
          where: { id: roomId },
        });
      } catch (e) {
        // Ignorer si la room a déjà été supprimée
      }
      return null;
    }

    if (room.hostId === userId) {
      const oldestPlayer = room.players.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];
      await this.prisma.client.room.update({
        where: { id: roomId },
        data: { hostId: oldestPlayer.userId },
      });
    }

    return this.getRoomById(roomId);
  }

  async closeRoom(roomId: string, userId: number) {
    const room = await this.getRoomById(roomId);

    if (room.hostId !== userId) {
      throw new BadRequestException("Seul l'hôte de la salle peut supprimer la salle");
    }

    this.cancelEmptyRoomCleanup(roomId);
    await this.prisma.client.room.delete({
      where: { id: roomId },
    });

    return room;
  }

  async toggleReady(roomId: string, userId: number) {
    const player = await this.prisma.client.roomPlayer.findUnique({
      where: { roomId_userId: { roomId, userId } },
    });

    if (!player) {
      throw new NotFoundException("Joueur introuvable dans la room");
    }

    await this.prisma.client.roomPlayer.update({
      where: { roomId_userId: { roomId, userId } },
      data: { isReady: !player.isReady },
    });

    return this.getRoomById(roomId);
  }

  async startGame(roomId: string, userId: number) {
    const room = await this.getRoomById(roomId);

    if (room.hostId !== userId) {
      throw new BadRequestException("Seul l'hôte de la salle peut démarrer la partie");
    }

    if (room.players.length < 1) {
      throw new BadRequestException("Il faut au moins 1 joueur pour démarrer");
    }

    const allReady = room.players.every((p) => p.isReady);
    if (!allReady) {
      throw new BadRequestException("Tous les joueurs doivent être prêts");
    }

    if (!room.quizId) {
      throw new BadRequestException("Veuillez sélectionner un quiz avant de démarrer");
    }

    await this.prisma.client.room.update({
      where: { id: roomId },
      data: { status: RoomStatus.PLAYING },
    });

    return this.getRoomById(roomId);
  }

  async updateRoomConfig(roomId: string, userId: number, config: { quizId?: number; maxPlayers?: number }) {
    const room = await this.getRoomById(roomId);

    if (room.hostId !== userId) {
      throw new BadRequestException("Seul l'hôte de la salle peut modifier la partie");
    }

    if (room.status === RoomStatus.PLAYING) {
      throw new BadRequestException("Impossible de modifier une partie en cours");
    }

    if (
      config.maxPlayers !== undefined &&
      config.maxPlayers < room.players.length
    ) {
      throw new BadRequestException(
        "Le nombre maximal de joueurs ne peut pas etre inferieur au nombre de joueurs presents",
      );
    }

    await this.prisma.client.room.update({
      where: { id: roomId },
      data: {
        ...(config.quizId !== undefined && { quizId: config.quizId }),
        ...(config.maxPlayers !== undefined && { maxPlayers: config.maxPlayers }),
      },
    });

    return this.getRoomById(roomId);
  }

  async kickPlayer(roomId: string, hostId: number, targetUserId: number) {
    const room = await this.getRoomById(roomId);

    if (room.hostId !== hostId) {
      throw new BadRequestException("Seul l'hôte de la salle peut expulser un joueur");
    }

    if (hostId === targetUserId) {
      throw new BadRequestException("Vous ne pouvez pas vous expulser vous-même");
    }

    if (room.status !== RoomStatus.WAITING) {
      throw new BadRequestException("Impossible d'expulser pendant une partie en cours");
    }

    return this.leaveRoom(roomId, targetUserId);
  }

  async endGame(roomId: string) {
    const room = await this.getRoomById(roomId);

    // Create match history
    const match = await this.prisma.client.matchHistory.create({
      data: {
        gameType: room.gameType,
        players: {
          create: room.players.map(p => ({
            userId: p.userId,
            score: p.score,
            isWinner: false
          }))
        }
      },
      include: {
        players: true
      }
    });

    // Determine winner
    const maxScore = Math.max(...room.players.map(p => p.score));
    if (room.players.length > 0) {
      const winners = room.players.filter(p => p.score === maxScore);

      await this.prisma.client.matchHistoryPlayer.updateMany({
        where: {
          matchId: match.id,
          score: maxScore,
        },
        data: {
          isWinner: true
        }
      });

      // Award 300 XP to all winners
      await this.prisma.client.user.updateMany({
        where: {
          id: {
            in: winners.map(w => w.userId),
          },
        },
        data: {
          xp: {
            increment: 300,
          },
        },
      });
    }

    // Update room status
    await this.prisma.client.room.update({
      where: { id: roomId },
      data: { status: RoomStatus.FINISHED },
    });

    return this.getRoomById(roomId);
  }

  async handleDisconnect(userId: number) {
    const roomPlayers = await this.prisma.client.roomPlayer.findMany({
      where: { userId },
      include: { room: true },
    });

    const affectedRooms = [];

    for (const rp of roomPlayers) {
      if (rp.room.status === RoomStatus.WAITING) {
        await this.prisma.client.roomPlayer.update({
          where: { id: rp.id },
          data: { isConnected: false },
        });

        const room = await this.getRoomById(rp.roomId);
        const hasConnectedPlayer = room.players.some((player) => player.isConnected);

        if (!hasConnectedPlayer) {
          this.scheduleEmptyRoomCleanup(rp.roomId);
        }

        affectedRooms.push({ roomId: rp.roomId, room, action: 'disconnect' });
      } else if (rp.room.status === RoomStatus.PLAYING) {
        await this.prisma.client.roomPlayer.update({
          where: { id: rp.id },
          data: { isConnected: false },
        });

        const room = await this.getRoomById(rp.roomId);
        affectedRooms.push({ roomId: rp.roomId, room, action: 'disconnect' });
      }
    }

    return affectedRooms;
  }

  private scheduleEmptyRoomCleanup(roomId: string) {
    if (this.cleanupTimers.has(roomId)) return;

    const timeout = setTimeout(() => {
      void this.cleanupEmptyRoom(roomId);
    }, EMPTY_ROOM_CLEANUP_DELAY_MS);

    this.cleanupTimers.set(roomId, timeout);
  }

  private cancelEmptyRoomCleanup(roomId: string) {
    const timeout = this.cleanupTimers.get(roomId);
    if (!timeout) return;

    clearTimeout(timeout);
    this.cleanupTimers.delete(roomId);
  }

  private async cleanupEmptyRoom(roomId: string) {
    this.cleanupTimers.delete(roomId);

    try {
      const room = await this.prisma.client.room.findUnique({
        where: { id: roomId },
        include: { players: true },
      });

      if (!room) return;

      const hasConnectedPlayer = room.players.some((player) => player.isConnected);
      if (hasConnectedPlayer) return;

      await this.prisma.client.room.delete({
        where: { id: roomId },
      });
    } catch {
      // Ignore cleanup errors or race conditions.
    }
  }

  private normalizeRoomName(rawName?: string): string | undefined {
    if (typeof rawName !== "string") {
      return undefined;
    }

    const normalizedName = rawName.trim();

    if (normalizedName.length === 0) {
      return undefined;
    }

    if (normalizedName.length < 2 || normalizedName.length > ROOM_NAME_MAX_LENGTH) {
      throw new BadRequestException("Le nom de la salle a un format invalide");
    }

    assertSafeTextInput(normalizedName, "Le nom de la salle");

    return normalizedName;
  }
}
