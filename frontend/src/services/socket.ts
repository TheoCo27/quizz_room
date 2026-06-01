import { io, Socket } from "socket.io-client";

// URL du backend (par défaut le domaine courant avec le port 3000 -> wait, le backend écoute sur quel port ?)
// Let's use relative path if we use a proxy or specific path. The backend WebSocket server uses port 8080 and CORS is true.
// Actually, in local dev, backend is on localhost:3000 but ws is bound to 8080? Wait!
// In rooms.gateway.ts: `@WebSocketGateway(8080, { cors: true, namespace: "/rooms" })`
// So it's ws://domain:8080/rooms

const SOCKET_URL = window.location.hostname === "localhost"
  ? "http://localhost:8080/rooms"
  : `https://${window.location.hostname}:8080/rooms`;

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