// backend/src/modules/rooms/rooms.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GameType, RoomStatus } from '../../../generated/prisma';

@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService) {}

  async createRoom(hostId: number, gameType: GameType, maxPlayers: number = 5) {
    return this.prisma.room.create({
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

  async getRoomById(roomId: string) {
    const room = await this.prisma.room.findUnique({
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
    // Vérifier si le joueur est déjà dans la room
    const existingPlayer = await this.prisma.roomPlayer.findUnique({
      where: { roomId_userId: { roomId, userId } },
    });

    if (existingPlayer) {
      return existingPlayer; 
    }

    return this.prisma.roomPlayer.create({
      data: {
        roomId,
        userId,
        isReady: false, 
      },
      include: {
        user: { select: { id: true, username: true, avatar_url: true } },
      },
    });
  }

  async leaveRoom(roomId: string, userId: number) {
    return this.prisma.roomPlayer.delete({
      where: { roomId_userId: { roomId, userId } },
    });
  }
}