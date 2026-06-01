import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { CyberPanel } from "../components/cyber";
import { getSocket, connectSocket, disconnectSocket } from "../services/socket";
import { useAuthSession } from "../hooks/useAuthSession";
import { Room } from "../services/rooms";
import { getQuizzes, Quiz } from "../services/quizzes";

export default function RoomPage() {
  const { id: roomId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isLoading } = useAuthSession();
  const [room, setRoom] = useState<Room | null>(null);
  const roomStatusRef = React.useRef<string | null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    getQuizzes().then(setQuizzes).catch(console.error);
  }, []);

  useEffect(() => {
    if (room) {
      roomStatusRef.current = room.status;
    }
  }, [room]);

  useEffect(() => {
    // Annuler tout "leave_room" en attente si on remonte (Strict Mode)
    if ((window as any).leaveRoomTimeout) {
      clearTimeout((window as any).leaveRoomTimeout);
      (window as any).leaveRoomTimeout = null;
    }

    if (isLoading || !user || !roomId) return;

    const socket = getSocket();
    connectSocket();

    const onConnect = () => {
      socket.emit("join_room", { roomId });
    };

    const onRoomStateUpdated = (updatedRoom: Room) => {
      roomStatusRef.current = updatedRoom.status;
      setRoom(updatedRoom);
      if (updatedRoom.status === "PLAYING") {
        navigate(`/game/${roomId}`);
      }
    };

    const onRoomClosed = () => {
      setError("La salle a été fermée.");
      setTimeout(() => navigate("/lobby"), 3000);
    };

    const onKicked = () => {
      setError("Vous avez été expulsé de la salle.");
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
    socket.on("kicked_from_room", onKicked);
    socket.on("game_starting", onGameStarting);
    socket.on("error", onError);

    return () => {
      socket.off("connect", onConnect);
      socket.off("room_state_updated", onRoomStateUpdated);
      socket.off("room_closed", onRoomClosed);
      socket.off("kicked_from_room", onKicked);
      socket.off("game_starting", onGameStarting);
      socket.off("error", onError);
      
      // Ne quitte pas la salle si la partie est en cours
      if (roomStatusRef.current !== "PLAYING") {
        (window as any).leaveRoomTimeout = setTimeout(() => {
          socket.emit("leave_room", { roomId });
        }, 500);
      }
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

  const handleQuizChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const socket = getSocket();
    socket.emit("update_config", { roomId, config: { quizId: parseInt(e.target.value, 10) } });
  };

  const handleKickPlayer = (targetUserId: number) => {
    if (!window.confirm("Voulez-vous vraiment expulser ce joueur ?")) return;
    const socket = getSocket();
    socket.emit("kick_player", { roomId, targetUserId });
  };

  const isHost = room?.hostId === user.id;
  const myPlayer = room?.players?.find((p) => p.userId === user.id);
  const allReady = room?.players?.every((p) => p.isReady);
  const hasMinPlayers = (room?.players?.length || 0) >= 1;
  const canStart = isHost && hasMinPlayers && allReady && room?.quizId;

  const selectedQuiz = quizzes.find((q) => q.id === room?.quizId);

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
              {room?.name ? room.name : `Salle de ${room?.host?.username || "..."}`}
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
                    <div className="flex items-center gap-4">
                      <span className={`px-3 py-1 rounded text-sm ${player.isReady ? 'bg-green-500/20 text-green-400 border border-green-500/50' : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50'}`}>
                        {player.isReady ? "Prêt" : "En attente"}
                      </span>
                      {isHost && player.userId !== user.id && (
                        <button
                          onClick={() => handleKickPlayer(player.userId)}
                          className="px-2 py-1 bg-red-900/50 text-red-400 border border-red-500/50 rounded hover:bg-red-800/50"
                          title="Expulser"
                        >
                          X
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-6">
              <div className="p-6 bg-background/50 rounded-xl border border-border/30">
                <h3 className="font-bold text-lg text-text mb-4">Configuration</h3>
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="block text-sm text-text-muted mb-1">Quiz sélectionné</label>
                    {isHost ? (
                      <select
                        value={room?.quizId || ""}
                        onChange={handleQuizChange}
                        className="w-full bg-background border border-border/50 text-text p-2 rounded"
                      >
                        <option value="" disabled>-- Choisir un quiz --</option>
                        {quizzes.map(q => (
                          <option key={q.id} value={q.id}>{q.title}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="p-2 border border-border/30 bg-background/30 rounded text-text">
                        {selectedQuiz ? selectedQuiz.title : "Aucun quiz sélectionné"}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleToggleReady}
                    className={`cyber-button px-4 py-3 font-bold w-full mt-2 ${myPlayer?.isReady ? 'opacity-80' : ''}`}
                  >
                    {myPlayer?.isReady ? "Je ne suis plus prêt" : "Je suis prêt !"}
                  </button>

                  {isHost && (
                    <>
                      <button
                        onClick={handleStartGame}
                        disabled={!canStart}
                        className="px-4 py-3 font-bold w-full bg-primary hover:bg-primary/90 text-background disabled:opacity-50 disabled:cursor-not-allowed rounded"
                      >
                        Démarrer la partie
                      </button>
                      {!canStart && (
                        <div className="text-xs text-yellow-400 text-center space-y-1">
                          {!hasMinPlayers && <p>Il faut au moins 1 joueur.</p>}
                          {!allReady && (room?.players?.length || 0) >= 2 && <p>Tous les joueurs doivent être prêts.</p>}
                          {!room?.quizId && <p>Veuillez sélectionner un quiz.</p>}
                        </div>
                      )}
                    </>
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
