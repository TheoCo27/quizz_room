import { Logger } from "@nestjs/common";
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
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
      const token =
        client.handshake.auth?.token ||
        (client.handshake.headers?.authorization || "").split(" ")[1];

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

  handleDisconnect(client: Socket) {
    this.logger.log("Client disconnected: " + client.id);
  }

  @SubscribeMessage("ping")
  handlePing(client: Socket, data: any) {
    return { event: "pong", data };
  }
}
