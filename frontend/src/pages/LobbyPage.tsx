import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CyberPanel } from "../components/cyber";
import { getRooms, createRoom, type Room } from "../services/rooms";
import { useAuthSession } from "../hooks/useAuthSession";

export default function LobbyPage() {
  const { user, isLoading } = useAuthSession();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      const interval = setInterval(fetchRooms, 5000); // refresh every 5s
      return () => clearInterval(interval);
    }
  }, [isLoading, user]);

  const handleCreateRoom = async () => {
    if (!user) return;
    setIsCreating(true);
    setError(null);
    try {
      const room = await createRoom({ gameType: "QUIZ", maxPlayers: 5 });
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
            <h1 className="cyber-title text-3xl text-text">Accès refusé</h1>
            <p className="mt-4 text-sm leading-7 text-text-muted">
              Vous devez être connecté pour accéder au lobby.
            </p>
            <button
              onClick={() => navigate("/login")}
              className="mt-6 cyber-button px-6 py-2"
            >
              Se connecter
            </button>
          </CyberPanel>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-1 px-6 py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <CyberPanel className="rounded-4xl p-8 md:p-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="cyber-title text-3xl text-text">Lobby</h1>
              <p className="mt-4 text-sm leading-7 text-text-muted">
                Rejoignez une salle ou créez la vôtre pour jouer avec vos amis.
              </p>
            </div>
            <button
              onClick={handleCreateRoom}
              disabled={isCreating}
              className="cyber-button px-6 py-3 font-bold"
            >
              {isCreating ? "Création..." : "Créer une salle"}
            </button>
          </div>

          {error && (
            <div className="mt-6 p-4 bg-red-900/50 border border-red-500 rounded text-red-200">
              {error}
            </div>
          )}

          <div className="mt-8">
            <h2 className="text-xl font-bold text-text mb-4">Salles disponibles</h2>
            {rooms.length === 0 ? (
              <p className="text-text-muted italic">Aucune salle en attente pour le moment.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {rooms.map((room) => (
                  <div key={room.id} className="border border-border/30 rounded-xl p-4 bg-background/50 hover:bg-background/80 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-lg text-primary">Salle de {room.host?.username || "Joueur"}</h3>
                      <span className="text-xs px-2 py-1 rounded bg-secondary/20 text-secondary border border-secondary/30">
                        {room.gameType}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-4">
                      <span className="text-sm text-text-muted">
                        Joueurs: {room._count?.players || 0} / {room.maxPlayers}
                      </span>
                      <button
                        onClick={() => handleJoinRoom(room.id)}
                        disabled={room._count?.players ? room._count.players >= room.maxPlayers : false}
                        className="cyber-button px-4 py-1 text-sm disabled:opacity-50"
                      >
                        Rejoindre
                      </button>
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
