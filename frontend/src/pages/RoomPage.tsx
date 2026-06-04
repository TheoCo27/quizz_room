import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { CyberPanel } from "../components/cyber";
import { getSocket, connectSocket, disconnectSocket } from "../services/socket";
import { useAuthSession } from "../hooks/useAuthSession";
import { Room } from "../services/rooms";
import { getQuizzes, Quiz } from "../services/quizzes";
import {
  ROOM_MESSAGE_MAX_LENGTH,
  normalizeInput,
  validateSafeText,
} from "../utils/input-validation";

type RoomChatMessage = {
  id: string;
  userId: number;
  username: string;
  avatar_url: string | null;
  content: string;
  createdAt: string;
};

export default function RoomPage() {
  const { id: roomId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isLoading } = useAuthSession();
  const [room, setRoom] = useState<Room | null>(null);
  const roomStatusRef = React.useRef<string | null>(null);
  const skipLeaveRef = React.useRef(false);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [chatMessages, setChatMessages] = useState<RoomChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const chatListRef = React.useRef<HTMLDivElement | null>(null);
  const shouldAutoScrollRef = React.useRef(true);
  const chatRateLimitRef = React.useRef({
    tokens: 10,
    lastRefill: Date.now(),
  });

  useEffect(() => {
    getQuizzes().then(setQuizzes).catch(console.error);
  }, []);

  useEffect(() => {
    if (room) {
      roomStatusRef.current = room.status;
    }
  }, [room]);

  useEffect(() => {
    const chatList = chatListRef.current;
    if (!chatList) return;
    if (shouldAutoScrollRef.current) {
      chatList.scrollTop = chatList.scrollHeight;
    }
  }, [chatMessages]);

  useEffect(() => {
    // Annuler tout "leave_room" en attente si on remonte (Strict Mode)
    if ((window as any).leaveRoomTimeout) {
      clearTimeout((window as any).leaveRoomTimeout);
      (window as any).leaveRoomTimeout = null;
    }

    if (isLoading || !user || !roomId) return;

    setChatMessages([]);

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
      skipLeaveRef.current = true;
      navigate("/lobby");
    };

    const onKicked = () => {
      skipLeaveRef.current = true;
      navigate("/lobby");
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
      setTimeout(() => {
        setError((prev) => (prev === data.message ? null : prev));
      }, 4000);
    };

    const onRoomMessage = (message: RoomChatMessage) => {
      setChatMessages((prev) => [...prev, message].slice(-100));
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
    socket.on("room_message", onRoomMessage);

    return () => {
      socket.off("connect", onConnect);
      socket.off("room_state_updated", onRoomStateUpdated);
      socket.off("room_closed", onRoomClosed);
      socket.off("kicked_from_room", onKicked);
      socket.off("game_starting", onGameStarting);
      socket.off("error", onError);
      socket.off("room_message", onRoomMessage);
      
      // Ne quitte pas la salle si la partie est en cours
      if (roomStatusRef.current !== "PLAYING" && !skipLeaveRef.current) {
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

  const handleLeaveRoom = () => {
    if (!roomId) return;
    skipLeaveRef.current = true;
    if ((window as any).leaveRoomTimeout) {
      clearTimeout((window as any).leaveRoomTimeout);
      (window as any).leaveRoomTimeout = null;
    }
    const socket = getSocket();
    socket.emit("leave_room", { roomId });
    navigate("/lobby");
  };

  const handleToggleReady = () => {
    const socket = getSocket();
    socket.emit("toggle_ready", { roomId });
  };

  const handleStartGame = () => {
    const socket = getSocket();
    socket.emit("start_game", { roomId });
  };

  const handleDeleteRoom = () => {
    if (!roomId) return;
    if (!window.confirm("Etes-vous sur de vouloir supprimer la salle ?")) return;
    const socket = getSocket();
    socket.emit("close_room", { roomId });
  };

  const handleQuizChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const quizId = parseInt(e.target.value, 10);
    if (Number.isNaN(quizId)) {
      return;
    }

    const socket = getSocket();
    socket.emit("update_config", { roomId, config: { quizId } });
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

  const handleSendMessage = (event: React.FormEvent) => {
    event.preventDefault();
    if (!roomId) return;
    const content = normalizeInput(chatInput);
    const contentError = validateSafeText(content, {
      label: "Le message",
      minLength: 1,
      maxLength: ROOM_MESSAGE_MAX_LENGTH,
    });

    if (contentError) {
      setError(contentError);
      setTimeout(() => {
        setError((prev) => (prev === contentError ? null : prev));
      }, 4000);
      return;
    }

    const now = Date.now();
    const capacity = 10;
    const windowMs = 30000;
    const replenishRate = capacity / windowMs;

    const elapsedMs = now - chatRateLimitRef.current.lastRefill;
    const addedTokens = elapsedMs * replenishRate;

    chatRateLimitRef.current.tokens = Math.min(capacity, chatRateLimitRef.current.tokens + addedTokens);
    chatRateLimitRef.current.lastRefill = now;

    if (chatRateLimitRef.current.tokens >= 1) {
      chatRateLimitRef.current.tokens -= 1;
    } else {
      const neededTokens = 1 - chatRateLimitRef.current.tokens;
      const retryAfterMs = neededTokens / replenishRate;
      const rateLimitMsg = `Vous devez attendre ${Math.ceil(retryAfterMs / 1000)} seconde(s) avant de renvoyer un message.`;
      
      setError(rateLimitMsg);
      setTimeout(() => {
        setError((prev) => (prev === rateLimitMsg ? null : prev));
      }, 4000);
      return;
    }

    const socket = getSocket();
    socket.emit("room_message", { roomId, content });
    setChatInput("");
  };

  const formatChatTime = (isoDate: string) => {
    const date = new Date(isoDate);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <main className="flex flex-1 px-6 py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <CyberPanel className="rounded-4xl p-8 md:p-10 relative overflow-hidden">
          {countdown !== null && (
            <div className="absolute inset-0 bg-background/90 z-10 flex flex-col items-center justify-center">
              <h2 className="text-4xl text-primary font-bold mb-4">Le contrat va débuter</h2>
              <span className="text-8xl text-secondary animate-pulse">{countdown}</span>
            </div>
          )}

          <div className="flex justify-between items-center mb-8">
            <h1 className="cyber-title text-3xl text-text">
              {room?.name ? room.name : `Terminal de ${room?.host?.username || "..."}`}
            </h1>
            <div className="flex items-center gap-3">
              {isHost && (
                <button
                  onClick={handleDeleteRoom}
                  className="px-4 py-2 border border-red-500/50 text-red-300 hover:text-red-200 hover:bg-red-900/30 rounded"
                >
                  Fermer le terminal
                </button>
              )}
              <button
                onClick={handleLeaveRoom}
                className="px-4 py-2 border border-border/50 text-text-muted hover:text-text hover:bg-background rounded"
              >
                Déconnecter du terminal
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-900/50 border border-red-500 rounded text-red-200">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              <div className="flex flex-col">
                <h2 className="text-xl font-bold text-text mb-4">Mercenaires ({room?.players?.length || 0}/{room?.maxPlayers || 0})</h2>
                <div className="space-y-4 max-h-[30rem] overflow-y-auto pr-2">
                  {[...(room?.players || [])].sort((a, b) => b.score - a.score).map((player, index) => (
                    <div key={player.id} className="flex items-center justify-between p-4 bg-background/50 rounded-xl border border-border/30">
                      <div className="flex items-center gap-4">
                        {player.user?.avatar_url ? (
                          <img
                            src={player.user.avatar_url}
                            alt={player.user.username || "Avatar"}
                            className="w-10 h-10 rounded-full object-cover border border-secondary/20"
                            loading="lazy"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center text-secondary font-bold">
                            {player.user?.username?.charAt(0).toUpperCase() || "?"}
                          </div>
                        )}
                        <div className="flex flex-col">
                          <span className="font-bold text-text">
                            {player.user?.username || `Mercenaire ${player.userId}`}
                            {player.userId === room?.hostId && " 👑"}
                          </span>
                          <span className="text-sm text-text-muted">
                            Rang #{index + 1} - {player.score} pts
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={`px-3 py-1 rounded text-sm ${player.isReady ? 'bg-green-500/20 text-green-400 border border-green-500/50' : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50'}`}>
                          {player.isReady ? "Synchro" : "Déconnecté"}
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

              <div className="p-6 bg-background/50 rounded-xl border border-border/30 flex flex-col h-[30rem]">
                <h3 className="font-bold text-lg text-text">Chat du terminal</h3>
                <div
                  ref={chatListRef}
                  className="mt-4 flex-1 overflow-y-auto space-y-4 pr-2"
                  onScroll={() => {
                    const chatList = chatListRef.current;
                    if (!chatList) return;
                    const distanceToBottom = chatList.scrollHeight - chatList.scrollTop - chatList.clientHeight;
                    shouldAutoScrollRef.current = distanceToBottom < 40;
                  }}
                >
                  {chatMessages.length === 0 ? (
                    <p className="text-sm text-text-muted italic">Aucun message pour le moment.</p>
                  ) : (
                    chatMessages.map((message) => (
                      <div key={message.id} className="flex items-start gap-3">
                        {message.avatar_url ? (
                          <img
                            src={message.avatar_url}
                            alt={message.username || "Avatar"}
                            className="w-8 h-8 rounded-full object-cover border border-secondary/20"
                            loading="lazy"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center text-secondary font-bold">
                            {message.username?.charAt(0).toUpperCase() || "?"}
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 text-xs text-text-muted">
                            <span className="font-bold text-text">{message.username}</span>
                            <span>{formatChatTime(message.createdAt)}</span>
                          </div>
                          <p className="text-sm text-text break-words">{message.content}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <form onSubmit={handleSendMessage} className="mt-4 flex items-center gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Saisir message..."
                    maxLength={ROOM_MESSAGE_MAX_LENGTH}
                    className="flex-1 bg-background border border-border/50 text-text px-3 py-2 rounded"
                  />
                  <button
                    type="submit"
                    disabled={!normalizeInput(chatInput)}
                    className="px-4 py-2 font-bold bg-primary hover:bg-primary/90 text-background disabled:opacity-50 disabled:cursor-not-allowed rounded"
                  >
                    Transmettre
                  </button>
                </form>
              </div>
            </div>

            <div className="flex flex-col gap-6">
              <div className="p-6 bg-background/50 rounded-xl border border-border/30">
                <h3 className="font-bold text-lg text-text mb-4">Paramètres Cyberdeck</h3>
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="block text-sm text-text-muted mb-1">Éclat chargé</label>
                    {isHost ? (
                      <select
                        value={room?.quizId || ""}
                        onChange={handleQuizChange}
                        className="room-quiz-select w-full bg-background/90 border border-secondary/60 text-text p-2 rounded focus:outline-none focus:ring-2 focus:ring-secondary/40 focus:border-secondary shadow-[0_0_18px_rgba(56,189,248,0.15)]"
                      >
                        <option value="" disabled className="text-text-muted bg-background">-- Charger un éclat --</option>
                        {quizzes.map(q => (
                          <option key={q.id} value={q.id} className="bg-background text-text">
                            {q.title}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="p-2 border border-border/30 bg-background/30 rounded text-text">
                        {selectedQuiz ? selectedQuiz.title : "Aucun éclat chargé"}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleToggleReady}
                    className={`cyber-button px-4 py-3 font-bold w-full mt-2 ${myPlayer?.isReady ? 'opacity-80' : ''}`}
                  >
                    {myPlayer?.isReady ? "Désynchroniser" : "Synchroniser !"}
                  </button>

                  {isHost && (
                    <>
                      <button
                        onClick={handleStartGame}
                        disabled={!canStart}
                        className="px-4 py-3 font-bold w-full bg-primary hover:bg-primary/90 text-background disabled:opacity-50 disabled:cursor-not-allowed rounded"
                      >
                        Lancer le contrat
                      </button>
                      {!canStart && (
                        <div className="text-xs text-yellow-400 text-center space-y-1">
                          {!hasMinPlayers && <p>Il faut au moins 1 mercenaire.</p>}
                          {!allReady && (room?.players?.length || 0) >= 2 && <p>Tous les mercenaires doivent être synchronisés.</p>}
                          {!room?.quizId && <p>Veuillez charger un éclat.</p>}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="p-6 bg-background/50 rounded-xl border border-border/30">
                <h3 className="font-bold text-lg text-text mb-2">Détails</h3>
                <ul className="text-sm text-text-muted space-y-2">
                  <li>Type de hack: <span className="text-secondary font-bold">{room?.gameType || "..."}</span></li>
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
