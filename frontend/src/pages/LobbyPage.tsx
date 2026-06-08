import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CyberPanel } from "../components/cyber";
import { getRooms, createRoom, type Room } from "../services/rooms";
import { useAuthSession } from "../hooks/useAuthSession";
import { getSocket } from "../services/socket";
import CyberButton from "../components/cyber/CyberButton";
import Input from "../components/ui/input";
import {
  ROOM_NAME_MAX_LENGTH,
  normalizeInput,
  validateOptionalRoomName,
} from "../utils/input-validation";

export default function LobbyPage() {
  const { user, isLoading } = useAuthSession();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roomName, setRoomName] = useState("");

  const fetchRooms = async () => {
    try {
      const data = await getRooms();
      setRooms(data);
    } catch (err: any) {
      setError(err.message || "Impossible de récupérer les salles");
    }
  };

  useEffect(() => {
    if (!isLoading && user) {
      fetchRooms();
      const interval = setInterval(fetchRooms, 5000); // fallback refresh every 5s

      const socket = getSocket();
      const handleRoomListChanged = () => {
        void fetchRooms();
      };

      socket.on("room_list_changed", handleRoomListChanged);

      return () => {
        clearInterval(interval);
        socket.off("room_list_changed", handleRoomListChanged);
      };
    }
  }, [isLoading, user]);

  const handleCreateRoom = async () => {
    if (!user) return;
    setIsCreating(true);
    setError(null);
    try {
      const normalizedRoomName = normalizeInput(roomName);
      const roomNameError = validateOptionalRoomName(normalizedRoomName);

      if (roomNameError) {
        setError(roomNameError);
        return;
      }

      const payload: { gameType: string; maxPlayers: number; name?: string } = { gameType: "QUIZ", maxPlayers: 5 };
      if (normalizedRoomName) {
        payload.name = normalizedRoomName;
      }
      const room = await createRoom(payload);
      navigate(`/room/${room.id}`);
    } catch (err: any) {
      setError(err.message || "Erreur lors de la création de la salle");
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinRoom = (roomId: string) => {
    navigate(`/room/${roomId}`);
  };

  if (isLoading) {
    return <div className="p-10 text-center text-text">Chargement...</div>;
  }

  if (!user) {
    return (
      <main className="flex flex-1 px-6 py-10">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
          <CyberPanel className="rounded-4xl p-8 md:p-10 text-center">
            <h1 className="cyber-title text-3xl text-text">Connexion refusée</h1>
            <p className="mt-4 text-sm leading-7 text-text-muted">
              Liaison neuronale requise. Veuillez synchroniser votre Cyberdeck.
            </p>
            <CyberButton
              onClick={() => navigate("/login")}
              className="mt-6 px-6 py-2"
              variant="solid"
            >
              Se connecter
            </CyberButton>
          </CyberPanel>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-1 px-6 py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <CyberPanel className="rounded-4xl p-8 md:p-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h1 className="cyber-title text-3xl text-text">Liste des rooms</h1>
              <p className="mt-4 text-sm leading-7 text-text-muted">
                Crée une room ou rejoins une partie disponible pour jouer en groupe.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="text"
                placeholder="Nom de la room (optionnel)"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                maxLength={ROOM_NAME_MAX_LENGTH}
                className="w-72 cyber-input-yellow"
              />
              <CyberButton
                onClick={handleCreateRoom}
                disabled={isCreating}
                className="px-6 py-3 font-bold"
              >
                {isCreating ? "Création..." : "Créer une room"}
              </CyberButton>
            </div>
          </div>

          {error && (
            <div className="mt-6 p-4 bg-red-900/50 border border-red-500 rounded text-red-200">
              {error}
            </div>
          )}

          <div className="mt-8">
            <h2 className="text-xl font-bold text-text mb-4">Rooms disponibles</h2>
            {rooms.length === 0 ? (
              <p className="text-text-muted italic">Aucune room disponible pour le moment.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {rooms.map((room) => (
                  <div key={room.id} className="border border-primary/20 rounded-xl p-4 bg-primary/5 hover:bg-primary/8 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-lg text-primary">
                        {room.name ? room.name : `Terminal de ${room.host?.username || "Mercenaire"}`}
                      </h3>
                      <span className="text-xs px-2 py-1 rounded bg-secondary/20 text-secondary border border-secondary/30">
                        {room.gameType}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-4">
                      <span className="text-sm text-text-muted">
                        Mercenaires: {room._count?.players || 0} / {room.maxPlayers}
                      </span>
                      <CyberButton
                        onClick={() => handleJoinRoom(room.id)}
                        disabled={room._count?.players ? room._count.players >= room.maxPlayers : false}
                        variant="ghost"
                        size="sm"
                        className="px-4 py-1 text-sm"
                      >
                        Rejoindre
                      </CyberButton>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CyberPanel>
      </div>
    </main>
  );
}
