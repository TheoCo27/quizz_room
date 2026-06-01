import type { ReactNode } from "react";
import { Link } from "react-router-dom";

type LegalSectionProps = {
  id: string;
  title: string;
  children: ReactNode;
};

type LegalPageLayoutProps = {
  eyebrow: string;
  title: string;
  updatedAt: string;
  intro: string;
  children: ReactNode;
};

export function LegalSection({ id, title, children }: LegalSectionProps) {
  return (
    <section
      aria-labelledby={id}
      className="cyber-card rounded-3xl px-6 py-6"
    >
      <h2 id={id} className="cyber-title text-xl text-text">
        {title}
      </h2>
      <div className="mt-4 space-y-4 text-sm leading-7 text-text-muted md:text-base">
        {children}
      </div>
    </section>
  );
}

export default function LegalPageLayout({
  eyebrow,
  title,
  updatedAt,
  intro,
  children,
}: LegalPageLayoutProps) {
  return (
    <main className="flex flex-1 px-6 py-8 md:px-10 md:py-12">
      <article className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <nav
          aria-label="Navigation juridique"
          className="text-sm text-text-muted"
        >
          <Link
            className="underline decoration-white/30 underline-offset-4 transition hover:text-text focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
            to="/"
          >
            Retour a l'accueil
          </Link>
        </nav>

        <header className="cyber-panel rounded-[2rem] px-6 py-8">
          <p className="cyber-eyebrow">{eyebrow}</p>
          <h1 className="mt-3 cyber-title text-4xl text-text md:text-5xl">
            {title}
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-text-muted md:text-base">
            {intro}
          </p>
          <p className="mt-4 text-sm text-text-muted">
            Derniere mise a jour : {updatedAt}
          </p>
        </header>

        <div className="space-y-6">{children}</div>
      </article>
    </main>
  );
}
