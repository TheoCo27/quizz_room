import { Controller, Get, Post, Body, UseGuards, Req } from "@nestjs/common";
import { Request } from "express";
import { RoomsService } from "./rooms.service";
import { AuthGuard } from "../auth/guards/auth.guard";
import { ok, type ApiResponse } from "../../common/http/api-response";
import { CreateRoomDto } from "./dto/create-room.dto";

@Controller("rooms")
@UseGuards(AuthGuard)
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Get()
  async getRooms(): Promise<ApiResponse<any>> {
    const rooms = await this.roomsService.getWaitingRooms();
    return ok(rooms);
  }

  @Post()
  async createRoom(
    @Body() dto: CreateRoomDto,
    @Req() req: Request,
  ): Promise<ApiResponse<any>> {
    const user = (req as any).user;
    const maxPlayers = dto.maxPlayers ?? 5;
    const room = await this.roomsService.createRoom(
      user.sub,
      dto.gameType,
      maxPlayers,
      dto.name,
      dto.quizId,
    );
    return ok(room);
  }
}
