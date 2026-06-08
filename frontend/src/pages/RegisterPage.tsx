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
  AUTH_PASSWORD_MAX_LENGTH,
  AUTH_PASSWORD_MIN_LENGTH,
  AUTH_USERNAME_MAX_LENGTH,
  AUTH_USERNAME_MIN_LENGTH,
  register,
} from "../services/auth";
import {
  normalizeInput,
  validateEmail,
  validatePassword,
  validateUsername,
} from "../utils/input-validation";

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
      const trimmedEmail = normalizeInput(email).toLowerCase();
      const trimmedUsername = normalizeInput(username);
      const emailError = validateEmail(trimmedEmail);
      const usernameError = validateUsername(trimmedUsername);
      const passwordError = validatePassword(password);

      if (emailError || usernameError || passwordError) {
        setError(emailError || usernameError || passwordError);
        return;
      }

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
    <main className="flex flex-1 px-6 py-10 items-center justify-center">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <CyberCard className="rounded-4xl p-8" accent="magenta">
          <p className="cyber-eyebrow">Inscription Réseau</p>
          <h2 className="mt-3 cyber-title text-2xl text-text">
            Créer un compte
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
              maxLength={255}
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
              maxLength={AUTH_USERNAME_MAX_LENGTH}
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
              maxLength={AUTH_PASSWORD_MAX_LENGTH}
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
              {isSubmitting ? "Création..." : "Créer le compte"}
            </PrimaryButton>
          </form>

          <p className="mt-5 text-center text-sm text-text-muted">
            Déjà enregistré ?{" "}
            <Link className="font-semibold underline" to="/login">
              Se connecter
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
