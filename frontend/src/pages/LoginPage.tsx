import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  CyberBadge,
  CyberButton,
  CyberCard,
  CyberPanel,
  CyberProgress,
  CyberStat,
} from "../components/cyber";
import Input from "../components/ui/input";
import PrimaryButton from "../components/ui/PrimaryButton";
import SecondaryButton from "../components/ui/SecondaryButton";
import { useToast } from "../components/ui/toast";
import { useAuthSession } from "../hooks/useAuthSession";
import { getUserFacingErrorMessage } from "../services/api";
import {
  AUTH_PASSWORD_MAX_LENGTH,
  AUTH_PASSWORD_MIN_LENGTH,
  AUTH_USERNAME_MIN_LENGTH,
  login,
  loginAsGuest,
} from "../services/auth";
import {
  normalizeInput,
  validateEmail,
  validatePassword,
  validateUsername,
} from "../utils/input-validation";
import { oauthErrorMsg } from "../utils/err-msg";

export default function LoginPage() {
  const navigate = useNavigate();
  const { user, isLoading } = useAuthSession();

  useEffect(() => {
    if (!isLoading && user) {
      navigate("/");
    }
  }, [user, isLoading, navigate]);

  const toast = useToast();
  const [searchParams] = useSearchParams();
  const oauthErrorParam = searchParams.get("oauthError");
  const oauthError =
    oauthErrorParam && oauthErrorMsg[oauthErrorParam]
      ? oauthErrorMsg[oauthErrorParam]
      : null;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [guestUsername, setGuestUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGuestSubmitting, setIsGuestSubmitting] = useState(false);

  const navigateAfterAuth = () => {
    navigate("/");
  };

  const googleAuthUrl = "/auth/google/start?returnTo=%2F";

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const normalizedEmail = normalizeInput(email).toLowerCase();
      const emailError = validateEmail(normalizedEmail);
      const passwordError = validatePassword(password);

      if (emailError || passwordError) {
        setError(emailError || passwordError);
        return;
      }

      await login({
        email: normalizedEmail,
        password,
      });
      toast.success("Connecté avec succès.");
      navigateAfterAuth();
    } catch (submitError) {
      setError(
        getUserFacingErrorMessage(submitError, "Échec de la connexion."),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGuestSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsGuestSubmitting(true);

    try {
      const normalizedGuestUsername = normalizeInput(guestUsername);
      const guestUsernameError = validateUsername(normalizedGuestUsername);

      if (guestUsernameError) {
        setError(guestUsernameError);
        return;
      }

      await loginAsGuest({
        username: normalizedGuestUsername,
      });
      toast.success("Connexion invité réussie.");
      navigateAfterAuth();
    } catch (submitError) {
      setError(
        getUserFacingErrorMessage(
          submitError,
          "Échec de la connexion en invité.",
        ),
      );
    } finally {
      setIsGuestSubmitting(false);
    }
  };

  return (
    <main className="flex flex-1 px-6 py-10">
      <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <CyberPanel className="rounded-4xl p-8">
          <p className="cyber-eyebrow">ft_transcendence // sub-net</p>
          <h1 className="mt-3 cyber-title text-3xl text-text">
            Portail de liaison réseau
          </h1>
          <p className="mt-4 text-sm leading-7 text-text-muted">
            Connecte ton cyberdeck pour accéder aux synchronisations réseau, aux Holocalls cryptés et aux outils d'encodage d'éclats.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <CyberBadge variant="info">Temps reel</CyberBadge>
            <CyberBadge variant="success">Sessions securisees</CyberBadge>
            <CyberBadge variant="warning">Chat actif</CyberBadge>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <CyberStat label="Latence cible" value="50ms" hint="Optimisee" />
            <CyberStat label="Stabilite" value="99.8%" hint="Surveillance" />
            <CyberStat label="Region" value="EU-West" hint="Auto" />
            <CyberStat label="Signal" value="Vert" hint="Flux ok" />
          </div>
          <CyberProgress className="mt-6" label="Integrite du flux" value={88} />
        </CyberPanel>

        <CyberCard className="rounded-4xl p-8" accent="magenta">
          <p className="cyber-eyebrow">Accès Cyberdeck</p>
          <h2 className="mt-3 cyber-title text-2xl text-text">
            Se connecter
          </h2>
          <p className="mt-3 text-sm text-text-muted">
            Initialise ton profil enregistré ou lance une liaison furtive d'invité.
          </p>

          {oauthError ? (
            <p className="mt-5 rounded-2xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
              {oauthError}
            </p>
          ) : null}

          <form
            aria-busy={isSubmitting}
            onSubmit={(event) => void handleSubmit(event)}
            autoComplete="on"
            className="mt-6"
          >
            <label
              className="mb-2 block text-sm font-medium text-text-muted"
              htmlFor="login-email"
            >
              Email
            </label>
            <Input
              className="mb-4 w-full"
              name="email"
              id="login-email"
              type="email"
              placeholder="email@exemple.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={isSubmitting}
              autoComplete="email"
              maxLength={255}
              required
            />

            <label
              className="mb-2 block text-sm font-medium text-text-muted"
              htmlFor="login-password"
            >
              Mot de passe
            </label>
            <Input
              className="mb-6 w-full"
              name="password"
              id="login-password"
              type="password"
              placeholder="Mot de passe"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-invalid={error ? "true" : "false"}
              disabled={isSubmitting}
              minLength={AUTH_PASSWORD_MIN_LENGTH}
              maxLength={AUTH_PASSWORD_MAX_LENGTH}
              autoComplete="current-password"
              required
            />

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
              {isSubmitting ? "Connexion..." : "Se connecter"}
            </PrimaryButton>
          </form>

          <CyberButton
            className="mt-4 w-full py-3 text-base"
            glow={false}
            type="button"
            variant="ghost"
            onClick={() => (window.location.href = googleAuthUrl)}
          >
            Continuer avec Google
          </CyberButton>

          <div className="my-6 flex items-center gap-4">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-xs font-semibold uppercase text-text-muted">
              ou
            </span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          <form
            aria-busy={isGuestSubmitting}
            onSubmit={(event) => void handleGuestSubmit(event)}
            autoComplete="off"
          >
            <label
              className="mb-2 block text-sm font-medium text-text-muted"
              htmlFor="guest-username"
            >
              Accès furtif d'invité
            </label>
            <Input
              className="mb-4 w-full"
              id="guest-username"
              name="guest_username"
              type="text"
              placeholder="Alias réseau unique"
              value={guestUsername}
              onChange={(event) => setGuestUsername(event.target.value)}
              disabled={isGuestSubmitting}
              minLength={AUTH_USERNAME_MIN_LENGTH}
              maxLength={20}
              autoComplete="off"
              required
            />

            <SecondaryButton
              className="w-full justify-center py-3 text-base"
              disabled={isGuestSubmitting}
              type="submit"
            >
              {isGuestSubmitting
                ? "Connexion invité..."
                : "Continuer en invité"}
            </SecondaryButton>
          </form>

          <p className="mt-5 text-center text-sm text-text-muted">
            Nouvelle empreinte ?{" "}
            <Link className="font-semibold underline" to="/register">
              Créer un profil
            </Link>
          </p>

          <p className="mt-4 text-center text-xs leading-6 text-text-muted">
            Les informations sur l'utilisation du service sont disponibles dans
            nos{" "}
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
