import { Logger } from "@nestjs/common";
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

@WebSocketGateway(8080, { cors: true, namespace: "/rooms" })
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
      await this.authService.getSessionUser(payload.sub);

      client.data.user = payload;
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
    @MessageBody() data: { roomId: string }
  ) {
    try {
      const userId = client.data.user.id;
      const updatedRoom = await this.roomsService.joinRoom(data.roomId, userId);
      
      client.join(data.roomId);
      this.server.to(data.roomId).emit("room_state_updated", updatedRoom);
    } catch (error: any) {
      this.logger.error(`Error in join_room: ${error.message}`);
      client.emit("error", { message: error.message });
    }
  }

  @SubscribeMessage("leave_room")
  async handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string }
  ) {
    try {
      const userId = client.data.user.id;
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

  @SubscribeMessage("toggle_ready")
  async handleToggleReady(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string }
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
    @MessageBody() data: { roomId: string }
  ) {
    try {
      const userId = client.data.user.id;
      await this.roomsService.startGame(data.roomId, userId);
      
      this.server.to(data.roomId).emit("game_starting", { countdown: 5 });
    } catch (error: any) {
      this.logger.error(`Error in start_game: ${error.message}`);
      client.emit("error", { message: error.message });
    }
  }
}
