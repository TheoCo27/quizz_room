import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  CyberBadge,
  CyberCard,
  CyberPanel,
  CyberProgress,
  CyberStat,
} from "../components/cyber";
import Input from "../components/ui/input";
import PrimaryButton from "../components/ui/PrimaryButton";
import { getUserFacingErrorMessage } from "../services/api";
import { useAuthSession } from "../hooks/useAuthSession";
import {
  AUTH_PASSWORD_MIN_LENGTH,
  AUTH_USERNAME_MIN_LENGTH,
  register,
} from "../services/auth";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { user, isLoading } = useAuthSession();

  useEffect(() => {
    if (!isLoading && user) {
      navigate("/");
    }
  }, [user, isLoading, navigate]);

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const trimmedEmail = email.trim();
      const trimmedUsername = username.trim();

      await register({
        email: trimmedEmail,
        username: trimmedUsername,
        password,
      });
      navigate("/");
    } catch (submitError) {
      setError(
        getUserFacingErrorMessage(submitError, "Échec de l'inscription"),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex flex-1 px-6 py-10">
      <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <CyberPanel className="rounded-4xl p-8">
          <p className="cyber-eyebrow">ft_transcendence // sub-net</p>
          <h1 className="mt-3 cyber-title text-3xl text-text">
            Générer profil neuronal
          </h1>
          <p className="mt-4 text-sm leading-7 text-text-muted">
            Enregistre ton empreinte pour pirater en direct, synchroniser tes Chooms et surveiller tes diagnostics neuro.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <CyberBadge variant="info">Profil public</CyberBadge>
            <CyberBadge variant="success">Canal Chooms</CyberBadge>
            <CyberBadge variant="warning">Diagnostics avancees</CyberBadge>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <CyberStat label="Niveau" value="01" hint="Evolution" />
            <CyberStat label="Region" value="EU-West" hint="Auto" />
            <CyberStat label="Securite" value="Base" hint="2FA dispo" />
            <CyberStat label="Matchs" value="0" hint="Demarrage" />
          </div>
          <CyberProgress className="mt-6" label="Initialisation" value={12} />
        </CyberPanel>

        <CyberCard className="rounded-4xl p-8" accent="magenta">
          <p className="cyber-eyebrow">Inscription Réseau</p>
          <h2 className="mt-3 cyber-title text-2xl text-text">
            Créer une empreinte synaptique
          </h2>
          <p className="mt-3 text-sm text-text-muted">
            Ton alias réseau doit contenir au moins {AUTH_USERNAME_MIN_LENGTH} caractères.
          </p>

          <form
            aria-busy={isSubmitting}
            onSubmit={(event) => void handleSubmit(event)}
            autoComplete="on"
            className="mt-6"
          >
            <label
              className="mb-2 block text-sm font-medium text-text-muted"
              htmlFor="register-email"
            >
              Email
            </label>
            <Input
              name="email"
              className="mb-4 w-full"
              id="register-email"
              type="email"
              placeholder="email@exemple.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={isSubmitting}
              autoComplete="email"
              required
            />

            <label
              className="mb-2 block text-sm font-medium text-text-muted"
              htmlFor="register-username"
            >
              Alias Réseau
            </label>
            <Input
              name="username"
              className="mb-4 w-full"
              id="register-username"
              type="text"
              placeholder="Ton alias réseau"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              disabled={isSubmitting}
              minLength={AUTH_USERNAME_MIN_LENGTH}
              maxLength={20}
              autoComplete="username"
              required
            />

            <label
              className="mb-2 block text-sm font-medium text-text-muted"
              htmlFor="register-password"
            >
              Mot de passe
            </label>
            <Input
              name="password"
              className="mb-2 w-full"
              id="register-password"
              type="password"
              placeholder={`Minimum ${AUTH_PASSWORD_MIN_LENGTH} caracteres`}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-invalid={error ? "true" : "false"}
              disabled={isSubmitting}
              minLength={AUTH_PASSWORD_MIN_LENGTH}
              autoComplete="new-password"
              required
            />
            <p className="mb-6 text-xs text-text-muted">
              Au moins {AUTH_PASSWORD_MIN_LENGTH} caractères avec une structure
              solide.
            </p>

            {error ? (
              <p className="mb-4 text-sm text-danger" role="alert">
                {error}
              </p>
            ) : null}

            <PrimaryButton
              className="w-full py-3 text-base"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? "Création..." : "Enregistrer profil"}
            </PrimaryButton>
          </form>

          <p className="mt-5 text-center text-sm text-text-muted">
            Déjà enregistré ?{" "}
            <Link className="font-semibold underline" to="/login">
              Synchroniser Cyberdeck
            </Link>
          </p>

          <p className="mt-4 text-center text-xs leading-6 text-text-muted">
            En creant un compte, vous acceptez nos{" "}
            <Link
              className="font-semibold underline underline-offset-4"
              to="/conditions-utilisation"
            >
              protocoles d'utilisation
            </Link>{" "}
            et nos{" "}
            <Link
              className="font-semibold underline underline-offset-4"
              to="/politique-confidentialite"
            >
              directives de confidentialité
            </Link>
            .
          </p>
        </CyberCard>
      </div>
    </main>
  );
}
