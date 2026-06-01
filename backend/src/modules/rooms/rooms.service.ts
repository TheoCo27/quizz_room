// backend/src/modules/rooms/rooms.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GameType, RoomStatus } from '../../../generated/prisma/client';

@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService) {}

  async createRoom(hostId: number, gameType: GameType, maxPlayers: number = 5) {
    return this.prisma.client.room.create({
      data: {
        hostId,
        gameType,
        status: RoomStatus.WAITING,
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

  async joinRoom(roomId: string, userId: number) {
    const room = await this.getRoomById(roomId);

    if (room.status !== RoomStatus.WAITING) {
      throw new BadRequestException("La room n'est pas en attente");
    }

    if (room.players.length >= room.maxPlayers) {
      throw new BadRequestException("La limite de joueurs est atteinte");
    }

    const existingPlayer = await this.prisma.client.roomPlayer.findUnique({
      where: { roomId_userId: { roomId, userId } },
    });

    if (!existingPlayer) {
      await this.prisma.client.roomPlayer.create({
        data: {
          roomId,
          userId,
          isReady: false,
        },
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
      await this.prisma.client.room.delete({
        where: { id: roomId },
      });
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
      throw new BadRequestException("Seul le créateur peut démarrer la partie");
    }

    if (room.players.length < 2) {
      throw new BadRequestException("Il faut au moins 2 joueurs pour démarrer");
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
      throw new BadRequestException("Seul le créateur peut modifier la partie");
    }

    if (room.status !== RoomStatus.WAITING) {
      throw new BadRequestException("Impossible de modifier une partie en cours");
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
      throw new BadRequestException("Seul le créateur peut expulser un joueur");
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
      await this.prisma.client.matchHistoryPlayer.updateMany({
        where: {
          matchId: match.id,
          score: maxScore,
        },
        data: {
          isWinner: true
        }
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
        const updatedRoom = await this.leaveRoom(rp.roomId, userId);
        affectedRooms.push({ roomId: rp.roomId, room: updatedRoom, action: 'leave' });
      } else if (rp.room.status === RoomStatus.PLAYING) {
        await this.prisma.client.roomPlayer.update({
          where: { id: rp.id },
          data: { isConnected: false },
        });

        const room = await this.getRoomById(rp.roomId);
        const connectedPlayers = room.players.filter(p => p.isConnected);

        if (connectedPlayers.length <= 1) {
          const finishedRoom = await this.endGame(rp.roomId);
          affectedRooms.push({ roomId: rp.roomId, room: finishedRoom, action: 'end' });
        } else {
          affectedRooms.push({ roomId: rp.roomId, room, action: 'disconnect' });
        }
      }
    }

    return affectedRooms;
  }
}
