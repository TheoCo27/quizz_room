import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  CyberBadge,
  CyberCard,
  CyberPanel,
  CyberProgress,
  CyberStat,
} from "../components/cyber";
import PrimaryButton from "../components/ui/PrimaryButton";
import SecondaryButton from "../components/ui/SecondaryButton";
import { useAuthSession } from "../hooks/useAuthSession";
import { getRooms, createRoom } from "../services/rooms";

export default function HomePage() {
  const { user, isLoading: isSessionLoading } = useAuthSession();
  const [waitingPlayersCount, setWaitingPlayersCount] = useState<number | null>(null);
  const navigate = useNavigate();

  const handleCreateRoom = async () => {
    if (isSessionLoading) return;
    if (!user) {
      navigate("/login");
      return;
    }
    try {
      const room = await createRoom({ gameType: "QUIZ", maxPlayers: 5 });
      navigate(`/room/${room.id}`);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (isSessionLoading || !user) {
      setWaitingPlayersCount(null);
      return;
    }

    let isMounted = true;

    const fetchRooms = async () => {
      try {
        const rooms = await getRooms();
        if (!isMounted) return;
        const totalPlayers = rooms.reduce(
          (sum, room) => sum + (room._count?.players ?? 0),
          0,
        );
        setWaitingPlayersCount(totalPlayers);
      } catch {
        if (isMounted) {
          setWaitingPlayersCount(null);
        }
      }
    };

    fetchRooms();
    const interval = setInterval(fetchRooms, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isSessionLoading, user]);
  return (
    <main className="flex flex-1 px-6 py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <CyberPanel className="rounded-4xl p-8 md:p-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <h1 className="mt-3 cyber-title text-3xl text-text">
                Accueil Quiz Room
              </h1>
              <p className="mt-4 text-sm leading-7 text-text-muted">
                Bienvenue dans la Quiz Room, Choom. Teste tes connaissances, défie d'autres Netrunners et grimpe dans le classement de Night City.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/admin">
                  <PrimaryButton>Créer un quiz</PrimaryButton>
                </Link>
                <Link to={user ? "/profile" : "/login"}>
                  <SecondaryButton>
                    {isSessionLoading
                      ? "Chargement..."
                      : user
                        ? "Profil"
                        : "Se connecter"}
                  </SecondaryButton>
                </Link>
              </div>
            </div>
          </div>
          <div className="mt-8 max-w-xs">
            <CyberStat label="Modules" value="14" hint="Synchro" />
          </div>
        </CyberPanel>

        <section className="grid gap-6 md:grid-cols-2">
          <CyberCard className="rounded-4xl p-6" accent="magenta">
            <p className="cyber-eyebrow">SALONS DE JEU</p>
            <h2 className="mt-2 cyber-title text-lg text-text">
              Liste des rooms
            </h2>
            <p className="mt-3 text-sm text-text-muted">
              Rejoins un salon public ou crée ta propre room de jeu pour affronter d'autres joueurs en temps réel sur tes quiz.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/lobby">
                <PrimaryButton>Voir les rooms</PrimaryButton>
              </Link>
              <SecondaryButton onClick={handleCreateRoom}>Créer une room</SecondaryButton>
            </div>
          </CyberCard>

          <CyberCard className="rounded-4xl p-6" accent="lime">
            <p className="cyber-eyebrow">RÉSEAU</p>
            <h2 className="mt-2 cyber-title text-lg text-text">
              Amis
            </h2>
            <p className="mt-3 text-sm text-text-muted">
              Ajoute tes amis, suis leur activité en direct et discutez ensemble pour préparer vos prochaines sessions de quiz.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/friends">
                <PrimaryButton>Voir mes amis</PrimaryButton>
              </Link>
              <Link to="/profile">
                <SecondaryButton>Profil</SecondaryButton>
              </Link>
            </div>
          </CyberCard>

          <CyberCard className="rounded-4xl p-6" accent="magenta">
            <p className="cyber-eyebrow">QUIZ</p>
            <h2 className="mt-2 cyber-title text-lg text-text">
              Mes quiz
            </h2>
            <p className="mt-3 text-sm text-text-muted">
              Crée et configure tes propres questionnaires avec des questions personnalisées, des réponses de ton choix et gère tes quiz.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/admin">
                <PrimaryButton>Créer un quizz</PrimaryButton>
              </Link>
            </div>
          </CyberCard>

          <CyberCard className="rounded-4xl p-6" accent="cyan">
            <p className="cyber-eyebrow">LÉGENDES</p>
            <h2 className="mt-2 cyber-title text-lg text-text">
              Classement
            </h2>
            <p className="mt-3 text-sm text-text-muted">
              Consulte le tableau de chasse des mercenaires les plus respectés
              du réseau. Réputation, XP et victoires accumulées.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/leaderboard">
                <PrimaryButton>Voir le classement</PrimaryButton>
              </Link>
            </div>
          </CyberCard>
        </section>
      </div>
    </main>
  );
}
