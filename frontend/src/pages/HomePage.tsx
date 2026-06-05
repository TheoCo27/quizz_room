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
              <p className="cyber-eyebrow">NIGHT_CITY_NET</p>
              <h1 className="mt-3 cyber-title text-3xl text-text">
                Accueil Quiz Room
              </h1>
              <p className="mt-4 text-sm leading-7 text-text-muted">
                Terminaux opérationnels. Les modules de communication cryptée (Chooms)
                et l'enregistrement d'éclats (Shards) restent actifs pendant que
                NetWatch reconstruit le protocole de l'Afterlife.
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
            <div className="flex flex-wrap gap-2">
              <CyberBadge variant="info">Temps réel</CyberBadge>
              <CyberBadge variant="success">Cyber-empreinte synchro</CyberBadge>
              <CyberBadge variant="warning">Afterlife hors-ligne</CyberBadge>
            </div>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <CyberStat label="Modules" value="04" hint="Synchro" />
            <CyberStat label="Holocall" value="Actif" hint="Canal Privé" />
            <CyberStat label="Éclats" value="Dispo" hint="Compilation" />
            <CyberStat label="Réseau" value="Stable" hint="Sub-Net EU" />
          </div>
          <CyberProgress className="mt-6" label="Stabilité du Sub-Net" value={76} />
        </CyberPanel>

        <section className="grid gap-6 md:grid-cols-2">
          <CyberCard className="rounded-4xl p-6" accent="magenta">
            <p className="cyber-eyebrow">CONTRATS</p>
            <h2 className="mt-2 cyber-title text-lg text-text">
              Liste des rooms
            </h2>
            <p className="mt-3 text-sm text-text-muted">
              Le protocole multijoueur revient bientôt. Enregistre des éclats de données
              et configure tes règles avant l'ouverture des contrats.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <CyberBadge variant="info">
                {typeof waitingPlayersCount === "number"
                  ? waitingPlayersCount === 1
                    ? "1 Choom en attente"
                    : `${waitingPlayersCount} Chooms en attente`
                  : "Chooms connectés"}
              </CyberBadge>
              <CyberBadge variant="warning">Contrats actifs</CyberBadge>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/lobby">
                <PrimaryButton>Voir les rooms</PrimaryButton>
              </Link>
              <Link to="/lobby">
                <SecondaryButton>Créer une room</SecondaryButton>
              </Link>
            </div>
          </CyberCard>

          <CyberCard className="rounded-4xl p-6" accent="lime">
            <p className="cyber-eyebrow">RÉSEAU</p>
            <h2 className="mt-2 cyber-title text-lg text-text">
              Amis
            </h2>
            <p className="mt-3 text-sm text-text-muted">
              Ajoute des mercenaires à ta liste de contacts, surveille leur statut réseau
              et échange en temps réel via Holocall privé.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <CyberBadge variant="success">Synchro</CyberBadge>
              <CyberBadge variant="info">Holocall direct</CyberBadge>
            </div>
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
            <p className="cyber-eyebrow">SHARDS</p>
            <h2 className="mt-2 cyber-title text-lg text-text">
              Mes quiz
            </h2>
            <p className="mt-3 text-sm text-text-muted">
              Configure des questionnaires, paramètres de hack et points d'XP.
              Chaque éclat compilé est prêt à être poussé sur le Net.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <CyberBadge variant="info">Compilateur</CyberBadge>
              <CyberBadge variant="warning">Validation</CyberBadge>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/admin">
                <PrimaryButton>Gérer les quiz</PrimaryButton>
              </Link>
              <SecondaryButton disabled>Importer un set</SecondaryButton>
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
            <div className="mt-4 flex flex-wrap gap-2">
              <CyberBadge variant="info">Classement</CyberBadge>
              <CyberBadge variant="warning">Réputation</CyberBadge>
              <CyberBadge variant="success">Street Cred</CyberBadge>
            </div>
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
