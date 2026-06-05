import { Logger, UsePipes, ValidationPipe } from "@nestjs/common";
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  ConnectedSocket,
  MessageBody,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { AuthService } from "../auth/auth.service";
import { RoomsService } from "./rooms.service";
import { JwtService } from "@nestjs/jwt";
import { QuizGameService } from "./quiz-game.service";
import { PrivateMessageRateLimitService } from "../users/private-message-rate-limit.service";
import {
  KickPlayerDto,
  RoomIdDto,
  RoomMessageDto,
  SubmitAnswerDto,
  UpdateRoomConfigDto,
} from "./dto/room-events.dto";

@WebSocketGateway({ cors: true, namespace: "/rooms" })
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class RoomsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RoomsGateway.name);

  constructor(
    private readonly roomsService: RoomsService,
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
    private readonly quizGameService: QuizGameService,
    private readonly rateLimitService: PrivateMessageRateLimitService,
  ) {}

  afterInit(server: Server) {
    this.logger.log("Gateway initialized");
  }

  async handleConnection(client: Socket) {
    try {
      let token =
        client.handshake.auth?.token ||
        (client.handshake.headers?.authorization || "").split(" ")[1];

      if (!token && client.handshake.headers?.cookie) {
        const cookies = client.handshake.headers.cookie.split(";").map(c => c.trim());
        const accessCookie = cookies.find(c => c.startsWith("access_token="));
        if (accessCookie) {
          token = accessCookie.split("=")[1];
        }
      }

      if (!token) {
        this.logger.warn("No token provided for client " + client.id);
        return client.disconnect();
      }

      const payload = await this.jwtService.verifyAsync(token);
      
      // Valider via AuthService
      const user = await this.authService.getSessionUser(payload.sub);

      client.data.user = user;
      this.logger.log("Client connected: " + client.id);
    } catch (error: any) {
      this.logger.error("Connection error for client " + client.id + ": " + error.message);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    this.logger.log("Client disconnected: " + client.id);
    
    if (client.data.user?.id) {
      try {
        const userId = client.data.user.id;
        const affectedRooms = await this.roomsService.handleDisconnect(userId);

        for (const { roomId, room, action } of affectedRooms) {
          if (action === 'leave') {
            if (room) {
              this.server.to(roomId).emit("room_state_updated", room);
            } else {
              this.server.to(roomId).emit("room_closed");
            }
          } else if (action === 'disconnect') {
            this.server.to(roomId).emit("player_disconnected", { userId });
            this.server.to(roomId).emit("room_state_updated", room);
          } else if (action === 'end') {
            this.server.to(roomId).emit("game_ended", room);
            this.server.to(roomId).emit("room_state_updated", room);
          }
        }
      } catch (error: any) {
        this.logger.error(`Error handling disconnect for client ${client.id}: ${error.message}`);
      }
    }
  }

  @SubscribeMessage("ping")
  handlePing(client: Socket, data: any) {
    return { event: "pong", data };
  }

  @SubscribeMessage("join_room")
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: RoomIdDto,
  ) {
    try {
      const userId = client.data.user.id;
      const updatedRoom = await this.roomsService.joinRoom(data.roomId, userId);
      
      client.join(data.roomId);
      this.server.to(data.roomId).emit("room_state_updated", updatedRoom);

      if (updatedRoom.status === "PLAYING") {
        const currentQuestion = this.quizGameService.getActiveGameQuestion(data.roomId, userId);
        if (currentQuestion) {
          client.emit("question", currentQuestion);
        }
      }
    } catch (error: any) {
      this.logger.error(`Error in join_room: ${error.message}`);
      client.emit("error", { message: error.message });
    }
  }

  @SubscribeMessage("leave_room")
  async handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: RoomIdDto,
  ) {
    try {
      const userId = client.data.user.id;
      this.logger.log(`Client ${client.id} (user ${userId}) explicitly requested to leave room ${data.roomId}`);
      const updatedRoom = await this.roomsService.leaveRoom(data.roomId, userId);

      if (updatedRoom != null) {
        this.server.to(data.roomId).emit("room_state_updated", updatedRoom);
      } else {
        this.server.to(data.roomId).emit("room_closed");
      }
      
      client.leave(data.roomId);
    } catch (error: any) {
      this.logger.error(`Error in leave_room: ${error.message}`);
      client.emit("error", { message: error.message });
    }
  }

  @SubscribeMessage("close_room")
  async handleCloseRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: RoomIdDto,
  ) {
    try {
      const userId = client.data.user.id;
      await this.roomsService.closeRoom(data.roomId, userId);

      this.server.to(data.roomId).emit("room_closed");

      const sockets = await this.server.in(data.roomId).fetchSockets();
      for (const socket of sockets) {
        socket.leave(data.roomId);
      }
    } catch (error: any) {
      this.logger.error(`Error in close_room: ${error.message}`);
      client.emit("error", { message: error.message });
    }
  }

  @SubscribeMessage("toggle_ready")
  async handleToggleReady(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: RoomIdDto,
  ) {
    try {
      const userId = client.data.user.id;
      const updatedRoom = await this.roomsService.toggleReady(data.roomId, userId);
      
      this.server.to(data.roomId).emit("room_state_updated", updatedRoom);
    } catch (error: any) {
      this.logger.error(`Error in toggle_ready: ${error.message}`);
      client.emit("error", { message: error.message });
    }
  }

  @SubscribeMessage("start_game")
  async handleStartGame(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: RoomIdDto,
  ) {
    try {
      const userId = client.data.user.id;
      // Validates and updates status to PLAYING
      const updatedRoom = await this.roomsService.startGame(data.roomId, userId);
      
      this.server.to(data.roomId).emit("game_starting", { countdown: 5 });
      
      // Delay to let frontend show countdown before navigating and getting the question
      setTimeout(() => {
        this.server.to(data.roomId).emit("room_state_updated", updatedRoom);
        this.quizGameService.startGameLoop(data.roomId, this.server);
      }, 5000);
      
    } catch (error: any) {
      this.logger.error(`Error in start_game: ${error.message}`);
      client.emit("error", { message: error.message });
    }
  }

  @SubscribeMessage("submit_answer")
  async handleSubmitAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SubmitAnswerDto,
  ) {
    try {
      const userId = client.data.user.id;
      this.quizGameService.submitAnswer(data.roomId, userId, data.answer);
    } catch (error: any) {
      this.logger.error(`Error in submit_answer: ${error.message}`);
    }
  }

  @SubscribeMessage("update_config")
  async handleUpdateConfig(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: UpdateRoomConfigDto,
  ) {
    try {
      const userId = client.data.user.id;
      const updatedRoom = await this.roomsService.updateRoomConfig(data.roomId, userId, data.config);
      this.server.to(data.roomId).emit("room_state_updated", updatedRoom);
    } catch (error: any) {
      this.logger.error(`Error in update_config: ${error.message}`);
      client.emit("error", { message: error.message });
    }
  }

  @SubscribeMessage("room_message")
  async handleRoomMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: RoomMessageDto,
  ) {
    try {
      const user = client.data.user;
      const roomId = data.roomId;
      const content = data.content;

      await this.roomsService.ensurePlayerInRoom(roomId, user.id);

      // Enforce rate limit of 10 messages every 30 seconds
      const limitResult = this.rateLimitService.consume(
        `room-message:${user.id}`,
        10,
        30000,
      );

      if (!limitResult.allowed) {
        client.emit("error", {
          message: `Vous devez attendre ${Math.ceil(limitResult.retryAfterMs / 1000)} seconde(s) avant de renvoyer un message.`,
        });
        return;
      }

      this.server.to(roomId).emit("room_message", {
        id: `${Date.now()}-${user.id}-${Math.floor(Math.random() * 10000)}`,
        userId: user.id,
        username: user.username,
        avatar_url: user.avatar_url ?? null,
        content,
        createdAt: new Date().toISOString(),
      });
    } catch (error: any) {
      this.logger.error(`Error in room_message: ${error.message}`);
      client.emit("error", { message: error.message });
    }
  }

  @SubscribeMessage("kick_player")
  async handleKickPlayer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: KickPlayerDto,
  ) {
    try {
      const userId = client.data.user.id;
      const updatedRoom = await this.roomsService.kickPlayer(data.roomId, userId, data.targetUserId);
      
      // Notify the kicked user directly
      const sockets = await this.server.in(data.roomId).fetchSockets();
      for (const socket of sockets) {
        if (socket.data?.user?.id === data.targetUserId) {
          socket.emit("kicked_from_room");
          socket.leave(data.roomId);
        }
      }

      if (updatedRoom) {
        this.server.to(data.roomId).emit("room_state_updated", updatedRoom);
      }
    } catch (error: any) {
      this.logger.error(`Error in kick_player: ${error.message}`);
      client.emit("error", { message: error.message });
    }
  }
}
