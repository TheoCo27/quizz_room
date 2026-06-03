import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CyberCard, CyberPanel } from "../components/cyber";
import { getWinsLeaderboard, type WinsLeaderboardEntry } from "../services/scores";

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<WinsLeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    getWinsLeaderboard(20)
      .then((data) => {
        if (isMounted) {
          setLeaderboard(data);
        }
      })
      .catch(() => {
        // Handle error if needed
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-6 py-10 md:px-10">
      <CyberPanel className="rounded-4xl p-6">
        <p className="cyber-eyebrow">Registre des Légendes de Night City</p>
        <h1 className="mt-2 cyber-title text-2xl text-text">
          Opérateurs les plus Actifs // Contrats
        </h1>
        <p className="mt-3 text-sm text-text-muted">
          Consulte les dossiers des mercenaires du réseau classés par contrats réussis.
        </p>
      </CyberPanel>

      <CyberCard className="rounded-4xl p-6">
        {isLoading ? (
          <p className="text-center text-text-muted">Lecture du registre des Légendes...</p>
        ) : leaderboard.length === 0 ? (
          <p className="text-center text-text-muted">Aucun dossier disponible.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-text">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase tracking-[0.1em] text-text-muted">
                  <th className="px-4 py-3 font-medium">Street Cred</th>
                  <th className="px-4 py-3 font-medium">Cyber-Alias</th>
                  <th className="px-4 py-3 font-medium text-right">Contrats Remplis</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry, index) => (
                  <tr
                    key={entry.userId}
                    className="border-b border-white/5 transition-colors hover:bg-white/5"
                  >
                    <td className="px-4 py-4 font-bold text-magenta">#{index + 1}</td>
                    <td className="px-4 py-4">
                      <Link
                        to={`/profile/${entry.userId}`}
                        className="hover:text-cyan-400 hover:underline transition-colors font-medium"
                      >
                        {entry.username}
                      </Link>
                    </td>
                    <td className="px-4 py-4 text-right text-lime font-medium">
                      {entry.totalWins}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CyberCard>
    </main>
  );
}
