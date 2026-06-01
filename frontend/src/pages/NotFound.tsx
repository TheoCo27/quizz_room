import { Link } from "react-router-dom";
import { CyberPanel } from "../components/cyber";
import PrimaryButton from "../components/ui/PrimaryButton";

export default function NotFound() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-10">
      <CyberPanel className="w-full max-w-2xl rounded-[2.5rem] p-8 text-center">
        <p className="cyber-eyebrow">Erreur 404</p>
        <h1 className="mt-4 cyber-title text-4xl text-text">
          Page introuvable
        </h1>
        <p className="mt-4 text-sm leading-7 text-text-muted">
          La route demandee n'existe pas ou a ete deplacee.
        </p>
        <div className="mt-6 flex justify-center">
          <Link to="/">
            <PrimaryButton>Retour a l'accueil</PrimaryButton>
          </Link>
        </div>
      </CyberPanel>
    </main>
  );
}
