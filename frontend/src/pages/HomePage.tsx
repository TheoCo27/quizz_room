import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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
import { getRooms } from "../services/rooms";

export default function HomePage() {
  const { user, isLoading: isSessionLoading } = useAuthSession();
  const [waitingPlayersCount, setWaitingPlayersCount] = useState<number | null>(null);

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
              <p className="cyber-eyebrow">ft_transcendence</p>
              <h1 className="mt-3 cyber-title text-3xl text-text">
                Base operationnelle active
              </h1>
              <p className="mt-4 text-sm leading-7 text-text-muted">
                L'accueil a ete simplifie pour repartir sur une base stable.
                Les modules amis, messagerie privee et creation de quiz restent
                disponibles pendant la reconstruction du lobby multijoueur.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/admin">
                  <PrimaryButton>Creer un quiz</PrimaryButton>
                </Link>
                <Link to={user ? "/profile" : "/login"}>
                  <SecondaryButton>
                    {isSessionLoading
                      ? "Chargement..."
                      : user
                        ? "Voir mon profil"
                        : "Se connecter"}
                  </SecondaryButton>
                </Link>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <CyberBadge variant="info">Temps reel</CyberBadge>
              <CyberBadge variant="success">Profil actif</CyberBadge>
              <CyberBadge variant="warning">Lobby en refonte</CyberBadge>
            </div>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <CyberStat label="Modules" value="04" hint="Disponibles" />
            <CyberStat label="Chat" value="Actif" hint="Prive" />
            <CyberStat label="Quiz" value="Ok" hint="Creation" />
            <CyberStat label="Serveurs" value="Stable" hint="EU-West" />
          </div>
          <CyberProgress className="mt-6" label="Etat plateforme" value={76} />
        </CyberPanel>

        <section className="grid gap-6 md:grid-cols-2">
          <CyberCard className="rounded-4xl p-6" accent="magenta">
            <p className="cyber-eyebrow">Jeu</p>
            <h2 className="mt-2 cyber-title text-lg text-text">
              Sessions live
            </h2>
            <p className="mt-3 text-sm text-text-muted">
              La couche multijoueur revient bientot. Prepare tes quiz et
              configure tes regles avant le lancement.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <CyberBadge variant="info">
                {typeof waitingPlayersCount === "number"
                  ? waitingPlayersCount === 1
                    ? "1 joueur"
                    : `${waitingPlayersCount} joueurs`
                  : "Joueurs en attente"}
              </CyberBadge>
              <CyberBadge variant="warning">Classements</CyberBadge>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/lobby">
                <PrimaryButton>Créer une partie</PrimaryButton>
              </Link>
              <Link to="/lobby">
                <SecondaryButton>Rejoindre une partie</SecondaryButton>
              </Link>
            </div>
          </CyberCard>

          <CyberCard className="rounded-4xl p-6" accent="lime">
            <p className="cyber-eyebrow">Social</p>
            <h2 className="mt-2 cyber-title text-lg text-text">
              Amis et chat prive
            </h2>
            <p className="mt-3 text-sm text-text-muted">
              Ajoute des contacts, surveille leur statut et echange en temps
              reel dans des canaux prives.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <CyberBadge variant="success">En ligne</CyberBadge>
              <CyberBadge variant="info">Messages directs</CyberBadge>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/friends">
                <PrimaryButton>Voir les amis</PrimaryButton>
              </Link>
              <Link to="/profile">
                <SecondaryButton>Mon profil</SecondaryButton>
              </Link>
            </div>
          </CyberCard>

          <CyberCard className="rounded-4xl p-6" accent="magenta">
            <p className="cyber-eyebrow">Administration</p>
            <h2 className="mt-2 cyber-title text-lg text-text">
              Gestion des quiz
            </h2>
            <p className="mt-3 text-sm text-text-muted">
              Compose des questionnaires, regles et points. Chaque quiz est
              pret a etre pousse en production.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <CyberBadge variant="info">Mode rapide</CyberBadge>
              <CyberBadge variant="warning">Validation</CyberBadge>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/admin">
                <PrimaryButton>Acceder aux quiz</PrimaryButton>
              </Link>
              <SecondaryButton disabled>Importer un set</SecondaryButton>
            </div>
          </CyberCard>

          <CyberCard className="rounded-4xl p-6" accent="cyan">
            <p className="cyber-eyebrow">Roadmap</p>
            <h2 className="mt-2 cyber-title text-lg text-text">
              Modules optionnels
            </h2>
            <p className="mt-3 text-sm text-text-muted">
              Statistiques avancees, succes, badges, classements et i18n sont
              prevus dans cette iteration.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <CyberBadge variant="info">Dashboard</CyberBadge>
              <CyberBadge variant="warning">Achievements</CyberBadge>
              <CyberBadge variant="success">i18n</CyberBadge>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/leaderboard">
                <PrimaryButton>Voir le classement global</PrimaryButton>
              </Link>
            </div>
          </CyberCard>
        </section>
      </div>
    </main>
  );
}
