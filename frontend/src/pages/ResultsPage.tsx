import React from "react";
import { CyberPanel } from "../components/cyber";

export default function ResultsPage() {
  return (
    <main className="flex flex-1 px-6 py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <CyberPanel className="rounded-4xl p-8 md:p-10">
          <h1 className="cyber-title text-3xl text-text">Résultats</h1>
          <p className="mt-4 text-sm leading-7 text-text-muted">
            La partie est terminée. Voici le classement !
          </p>
        </CyberPanel>
      </div>
    </main>
  );
}
