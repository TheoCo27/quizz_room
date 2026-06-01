import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { CyberPanel } from "../components/cyber";
import { getSocket } from "../services/socket";
import { useAuthSession } from "../hooks/useAuthSession";
import { Room } from "../services/rooms";

export default function GamePage() {
  const { id: roomId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthSession();
  const [room, setRoom] = useState<Room | null>(null);

  useEffect(() => {
    if (!roomId) return;
    const socket = getSocket();

    const onRoomStateUpdated = (updatedRoom: Room) => {
      setRoom(updatedRoom);
      if (updatedRoom.status === "FINISHED") {
        setTimeout(() => navigate(`/results`), 5000);
      }
    };

    socket.on("room_state_updated", onRoomStateUpdated);

    return () => {
      socket.off("room_state_updated", onRoomStateUpdated);
    };
  }, [roomId, navigate]);

  return (
    <main className="flex flex-1 px-6 py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <CyberPanel className="rounded-4xl p-8 md:p-10 text-center">
          <h1 className="cyber-title text-3xl text-text">Jeu en cours</h1>
          <p className="mt-4 text-sm leading-7 text-text-muted mb-8">
            La partie a commencé. Le système de quiz complet sera bientôt implémenté !
          </p>

          <div className="animate-pulse p-10 border border-secondary/30 bg-secondary/10 rounded-xl">
            <p className="text-xl text-secondary font-bold">Waiting for game loop integration...</p>
          </div>

          {room?.hostId === user?.id && room?.status === "PLAYING" && (
            <button
              onClick={() => {
                // Simulating game end
                const socket = getSocket();
                // We'd need an event in backend to end game for debugging, 
                // but since we don't have one exposed to clients except leaving...
                navigate(`/room/${roomId}`);
              }}
              className="mt-8 px-6 py-2 border border-primary/50 text-primary hover:bg-primary/10 rounded"
            >
              Retour à la salle
            </button>
          )}
        </CyberPanel>
      </div>
    </main>
  );
}
