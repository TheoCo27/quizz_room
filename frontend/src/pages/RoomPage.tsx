import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { CyberPanel } from "../components/cyber";
import { getSocket, connectSocket, disconnectSocket } from "../services/socket";
import { useAuthSession } from "../hooks/useAuthSession";
import { Room } from "../services/rooms";

export default function RoomPage() {
  const { id: roomId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isLoading } = useAuthSession();
  const [room, setRoom] = useState<Room | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    if (isLoading || !user || !roomId) return;

    const socket = getSocket();
    connectSocket();

    const onConnect = () => {
      socket.emit("join_room", { roomId });
    };

    const onRoomStateUpdated = (updatedRoom: Room) => {
      setRoom(updatedRoom);
      if (updatedRoom.status === "PLAYING") {
        navigate(`/game/${roomId}`);
      }
    };

    const onRoomClosed = () => {
      setError("La salle a été fermée.");
      setTimeout(() => navigate("/lobby"), 3000);
    };

    const onGameStarting = (data: { countdown: number }) => {
      setCountdown(data.countdown);
      let count = data.countdown;
      const interval = setInterval(() => {
        count--;
        if (count > 0) {
          setCountdown(count);
        } else {
          clearInterval(interval);
        }
      }, 1000);
    };

    const onError = (data: { message: string }) => {
      setError(data.message);
    };

    if (socket.connected) {
      socket.emit("join_room", { roomId });
    }

    socket.on("connect", onConnect);
    socket.on("room_state_updated", onRoomStateUpdated);
    socket.on("room_closed", onRoomClosed);
    socket.on("game_starting", onGameStarting);
    socket.on("error", onError);

    return () => {
      socket.off("connect", onConnect);
      socket.off("room_state_updated", onRoomStateUpdated);
      socket.off("room_closed", onRoomClosed);
      socket.off("game_starting", onGameStarting);
      socket.off("error", onError);
      
      // Ne quitte pas la salle si la partie est en cours
      setRoom((currentRoom) => {
        if (currentRoom?.status !== "PLAYING") {
          socket.emit("leave_room", { roomId });
        }
        return currentRoom;
      });
    };
  }, [isLoading, user, roomId, navigate]);

  if (isLoading) {
    return <div className="p-10 text-center text-text">Chargement...</div>;
  }

  if (!user) {
    return <div className="p-10 text-center text-text">Non autorisé</div>;
  }

  const handleToggleReady = () => {
    const socket = getSocket();
    socket.emit("toggle_ready", { roomId });
  };

  const handleStartGame = () => {
    const socket = getSocket();
    socket.emit("start_game", { roomId });
  };

  const isHost = room?.hostId === user.id;
  const myPlayer = room?.players?.find((p) => p.userId === user.id);
  const allReady = room?.players?.every((p) => p.isReady);
  const canStart = isHost && (room?.players?.length || 0) >= 2 && allReady;

  return (
    <main className="flex flex-1 px-6 py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <CyberPanel className="rounded-4xl p-8 md:p-10 relative overflow-hidden">
          {countdown !== null && (
            <div className="absolute inset-0 bg-background/90 z-10 flex flex-col items-center justify-center">
              <h2 className="text-4xl text-primary font-bold mb-4">La partie va commencer</h2>
              <span className="text-8xl text-secondary animate-pulse">{countdown}</span>
            </div>
          )}

          <div className="flex justify-between items-center mb-8">
            <h1 className="cyber-title text-3xl text-text">
              Salle de {room?.host?.username || "..."}
            </h1>
            <button
              onClick={() => navigate("/lobby")}
              className="px-4 py-2 border border-border/50 text-text-muted hover:text-text hover:bg-background rounded"
            >
              Quitter la salle
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-900/50 border border-red-500 rounded text-red-200">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <h2 className="text-xl font-bold text-text mb-4">Joueurs ({room?.players?.length || 0}/{room?.maxPlayers || 0})</h2>
              <div className="space-y-4">
                {room?.players?.map((player) => (
                  <div key={player.id} className="flex items-center justify-between p-4 bg-background/50 rounded-xl border border-border/30">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center text-secondary font-bold">
                        {player.user?.username?.charAt(0).toUpperCase() || "?"}
                      </div>
                      <span className="font-bold text-text">
                        {player.user?.username || `Joueur ${player.userId}`}
                        {player.userId === room.hostId && " 👑"}
                      </span>
                    </div>
                    <span className={`px-3 py-1 rounded text-sm ${player.isReady ? 'bg-green-500/20 text-green-400 border border-green-500/50' : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50'}`}>
                      {player.isReady ? "Prêt" : "En attente"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-6">
              <div className="p-6 bg-background/50 rounded-xl border border-border/30">
                <h3 className="font-bold text-lg text-text mb-4">Actions</h3>
                <div className="flex flex-col gap-4">
                  <button
                    onClick={handleToggleReady}
                    className={`cyber-button px-4 py-3 font-bold w-full ${myPlayer?.isReady ? 'opacity-80' : ''}`}
                  >
                    {myPlayer?.isReady ? "Je ne suis plus prêt" : "Je suis prêt !"}
                  </button>

                  {isHost && (
                    <button
                      onClick={handleStartGame}
                      disabled={!canStart}
                      className="px-4 py-3 font-bold w-full bg-primary hover:bg-primary/90 text-background disabled:opacity-50 disabled:cursor-not-allowed rounded"
                    >
                      Démarrer la partie
                    </button>
                  )}
                </div>
              </div>

              <div className="p-6 bg-background/50 rounded-xl border border-border/30">
                <h3 className="font-bold text-lg text-text mb-2">Détails</h3>
                <ul className="text-sm text-text-muted space-y-2">
                  <li>Mode de jeu: <span className="text-secondary font-bold">{room?.gameType || "..."}</span></li>
                  <li>Statut: <span className="text-text">{room?.status || "..."}</span></li>
                </ul>
              </div>
            </div>
          </div>
        </CyberPanel>
      </div>
    </main>
  );
}
