import { apiRequest } from "./api";

export type SafeUserRoom = {
  id: number;
  username: string;
  avatar_url: string | null;
};

export type RoomPlayer = {
  id: number;
  userId: number;
  isReady: boolean;
  score: number;
  isConnected: boolean;
  user?: SafeUserRoom;
};

export type Room = {
  id: string;
  name?: string | null;
  hostId: number;
  gameType: "QUIZ"; // update this as needed based on Prisma GameType
  status: "WAITING" | "PLAYING" | "FINISHED";
  maxPlayers: number;
  quizId?: number | null;
  createdAt: string;
  host?: SafeUserRoom;
  players?: RoomPlayer[];
  _count?: {
    players: number;
  };
};

export async function getRooms(): Promise<Room[]> {
  return apiRequest<Room[]>("/rooms");
}

export async function createRoom(payload: { gameType: string; maxPlayers?: number; name?: string; quizId?: number }): Promise<Room> {
  return apiRequest<Room>("/rooms", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}