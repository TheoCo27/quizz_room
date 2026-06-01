import { io, Socket } from "socket.io-client";

const SOCKET_URL = "/rooms";

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      withCredentials: true, // Pour envoyer les cookies (access_token)
      autoConnect: false,    // On le connecte manuellement quand l'utilisateur est auth
    });
  }
  return socket;
};

export const connectSocket = () => {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
  }
};

export const disconnectSocket = () => {
  if (socket?.connected) {
    socket.disconnect();
  }
};