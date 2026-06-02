import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  CyberAvatar,
  CyberBadge,
  CyberCard,
  CyberPanel,
  CyberProgress,
  CyberSelect,
  CyberStat,
  CyberTabs,
} from "../components/cyber";
import Input from "../components/ui/input";
import PrimaryButton from "../components/ui/PrimaryButton";
import SecondaryButton from "../components/ui/SecondaryButton";
import { useAuthSession } from "../hooks/useAuthSession";
import { getUserFacingErrorMessage } from "../services/api";
import { AUTH_USERNAME_MIN_LENGTH } from "../services/auth";
import { updateMyAvatar, updateMyProfile } from "../services/users";

import { getMyQuizzes, deleteQuiz, type Quiz } from "../services/quizzes";

const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024;
const SUPPORTED_AVATAR_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

type ProfileTabId =
  | "overview"
  | "history"
  | "achievements"
  | "social"
  | "security"
  | "preferences"
  | "quizzes";

function formatJoinedDate(createdAt: string) {
  try {
    return new Date(createdAt).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return createdAt;
  }
}

function formatIdentityLabel(user: { email: string; isGuest: boolean }) {
  if (user.isGuest) {
    return "Compte invite";
  }

  return user.email;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Impossible de lire cette image"));
    };

    reader.onerror = () => {
      reject(new Error("Impossible de lire cette image"));
    };

    reader.readAsDataURL(file);
  });
}

export default function ProfilePage() {
  const { user, isLoading, refreshSession } = useAuthSession();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isAvatarSubmitting, setIsAvatarSubmitting] = useState(false);
  const [profileUsername, setProfileUsername] = useState("");
  const [profileStatus, setProfileStatus] = useState<"online" | "offline">(
    "online",
  );
  const [isProfileSubmitting, setIsProfileSubmitting] = useState(false);
  const [avatarNotice, setAvatarNotice] = useState<{
    kind: "success" | "error";
    message: string;
  } | null>(null);
  const [profileNotice, setProfileNotice] = useState<{
    kind: "success" | "error";
    message: string;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<ProfileTabId>("overview");
  const [myQuizzes, setMyQuizzes] = useState<Quiz[]>([]);
  const [isQuizzesLoading, setIsQuizzesLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      return;
    }

    setProfileUsername(user.username);
    setProfileStatus(user.status);
  }, [user]);

  useEffect(() => {
    if (activeTab === "quizzes") {
      setIsQuizzesLoading(true);
      getMyQuizzes()
        .then(setMyQuizzes)
        .catch(console.error)
        .finally(() => setIsQuizzesLoading(false));
    }
  }, [activeTab]);

  const handleDeleteQuiz = async (quizId: number) => {
    if (!window.confirm("Voulez-vous vraiment supprimer ce quiz ?")) return;
    try {
      await deleteQuiz(quizId);
      setMyQuizzes((prev) => prev.filter((q) => q.id !== quizId));
    } catch (error) {
      alert(getUserFacingErrorMessage(error, "Impossible de supprimer le quiz."));
    }
  };

  if (isLoading) {
    return (
      <main className="mx-auto flex w-full max-w-6xl flex-1 px-6 py-10 md:px-10">
        <CyberCard className="w-full p-8">
          <p className="cyber-eyebrow">Profil</p>
          <h1 className="mt-4 cyber-title text-xl text-text">
            Chargement du profil...
          </h1>
        </CyberCard>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="mx-auto flex w-full max-w-6xl flex-1 px-6 py-10 md:px-10">
        <CyberPanel className="w-full rounded-[2.5rem] p-8">
          <p className="cyber-eyebrow">Profil</p>
          <h1 className="mt-4 cyber-title text-3xl text-text">
            Connexion requise
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-text-muted">
            Connecte-toi pour accéder à ta page profil et retrouver tes
            informations de session.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link to="/login">
              <PrimaryButton>Se connecter</PrimaryButton>
            </Link>
            <Link to="/register">
              <SecondaryButton>S'inscrire</SecondaryButton>
            </Link>
          </div>
        </CyberPanel>
      </main>
    );
  }

  const handleAvatarFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setAvatarNotice(null);

    if (!SUPPORTED_AVATAR_TYPES.has(file.type)) {
      setAvatarNotice({
        kind: "error",
        message: "Formats acceptes: JPG, PNG ou WEBP.",
      });
      event.target.value = "";
      return;
    }

    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      setAvatarNotice({
        kind: "error",
        message: "L'image doit faire 2 Mo maximum.",
      });
      event.target.value = "";
      return;
    }

    setIsAvatarSubmitting(true);

    try {
      const avatarDataUrl = await readFileAsDataUrl(file);
      await updateMyAvatar(avatarDataUrl);
      await refreshSession();
      setAvatarNotice({
        kind: "success",
        message: "Photo de profil mise a jour.",
      });
    } catch (error) {
      const message = getUserFacingErrorMessage(
        error,
        "Impossible de mettre a jour la photo de profil.",
      );
      if (message) {
        setAvatarNotice({
          kind: "error",
          message,
        });
      }
    } finally {
      setIsAvatarSubmitting(false);
      event.target.value = "";
    }
  };

  const handleAvatarRemove = async () => {
    setAvatarNotice(null);
    setIsAvatarSubmitting(true);

    try {
      await updateMyAvatar(null);
      await refreshSession();
      setAvatarNotice({
        kind: "success",
        message: "Photo de profil supprimee.",
      });
    } catch (error) {
      const message = getUserFacingErrorMessage(
        error,
        "Impossible de supprimer la photo de profil.",
      );
      if (message) {
        setAvatarNotice({
          kind: "error",
          message,
        });
      }
    } finally {
      setIsAvatarSubmitting(false);
    }
  };

  const handleProfileSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const trimmedUsername = profileUsername.trim();
    setProfileNotice(null);

    if (trimmedUsername.length < AUTH_USERNAME_MIN_LENGTH) {
      setProfileNotice({
        kind: "error",
        message: `Le pseudo doit contenir au moins ${AUTH_USERNAME_MIN_LENGTH} caracteres.`,
      });
      return;
    }

    setIsProfileSubmitting(true);

    try {
      await updateMyProfile({
        username: trimmedUsername,
        status: profileStatus,
      });
      await refreshSession();
      setProfileNotice({
        kind: "success",
        message: "Profil mis a jour.",
      });
    } catch (error) {
      const message = getUserFacingErrorMessage(
        error,
        "Impossible de mettre a jour le profil.",
      );
      if (message) {
        setProfileNotice({
          kind: "error",
          message,
        });
      }
    } finally {
      setIsProfileSubmitting(false);
    }
  };

  const handleProfileReset = () => {
    if (!user) {
      return;
    }

    setProfileUsername(user.username);
    setProfileStatus(user.status);
    setProfileNotice(null);
  };

  const hasProfileChanges =
    profileUsername.trim() !== user.username || profileStatus !== user.status;

  const profileTabs: Array<{ id: ProfileTabId; label: string }> = [
    { id: "overview", label: "Vue d'ensemble" },
    { id: "quizzes", label: "Mes quizz" },
    { id: "history", label: "Historique" },
    { id: "achievements", label: "Succes" },
    { id: "social", label: "Social" },
    { id: "security", label: "Securite" },
    { id: "preferences", label: "Preferences" },
  ];

  const tabContent = {
    overview: (
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="flex flex-col gap-6">
          <CyberCard className="rounded-4xl p-6">
            <p className="cyber-eyebrow">Identite</p>
            <h3 className="mt-2 cyber-title text-sm text-text">
              Avatar et presence
            </h3>
            <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
              <CyberAvatar
                alt={`Photo de profil de ${user.username}`}
                avatarUrl={user.avatar_url}
                size="md"
                status={user.status}
                username={user.username}
              />
              <div className="flex-1">
                <p className="text-sm leading-7 text-text-muted">
                  Ajoute une image JPG, PNG ou WEBP jusqu'a 2 Mo.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <PrimaryButton
                    disabled={isAvatarSubmitting}
                    onClick={() => fileInputRef.current?.click()}
                    type="button"
                  >
                    {isAvatarSubmitting
                      ? "Mise a jour..."
                      : "Changer la photo"}
                  </PrimaryButton>
                  <SecondaryButton
                    disabled={isAvatarSubmitting || !user.avatar_url}
                    onClick={() => void handleAvatarRemove()}
                    type="button"
                  >
                    Supprimer
                  </SecondaryButton>
                </div>
                {avatarNotice ? (
                  <p
                    className={`mt-4 text-sm ${avatarNotice.kind === "success"
                        ? "text-success"
                        : "text-danger"
                      }`}
                    role="alert"
                  >
                    {avatarNotice.message}
                  </p>
                ) : null}
              </div>
            </div>
          </CyberCard>

          <CyberCard className="rounded-4xl p-6" accent="lime">
            <p className="cyber-eyebrow">Profil</p>
            <h3 className="mt-2 cyber-title text-sm text-text">
              Pseudo et statut
            </h3>
            <form
              className="mt-4 space-y-4"
              onSubmit={(event) => void handleProfileSubmit(event)}
            >
              <label className="block">
                <span className="text-sm font-medium">Pseudo</span>
                <Input
                  className="mt-2 w-full"
                  type="text"
                  maxLength={20}
                  minLength={AUTH_USERNAME_MIN_LENGTH}
                  onChange={(event) => setProfileUsername(event.target.value)}
                  placeholder="Nouveau pseudo"
                  value={profileUsername}
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium">Statut</span>
                <div className="mt-2">
                  <CyberSelect
                    onChange={(event) =>
                      setProfileStatus(
                        event.target.value as "online" | "offline",
                      )
                    }
                    value={profileStatus}
                  >
                    <option value="online">online</option>
                    <option value="offline">offline</option>
                  </CyberSelect>
                </div>
              </label>

              <div className="flex flex-wrap gap-3">
                <PrimaryButton
                  disabled={isProfileSubmitting || !hasProfileChanges}
                  type="submit"
                >
                  {isProfileSubmitting
                    ? "Enregistrement..."
                    : "Enregistrer"}
                </PrimaryButton>
                <SecondaryButton
                  disabled={isProfileSubmitting || !hasProfileChanges}
                  onClick={handleProfileReset}
                  type="button"
                >
                  Annuler
                </SecondaryButton>
              </div>

              {profileNotice ? (
                <p
                  className={`text-sm ${profileNotice.kind === "success"
                      ? "text-success"
                      : "text-danger"
                    }`}
                  role="alert"
                >
                  {profileNotice.message}
                </p>
              ) : null}
            </form>
          </CyberCard>
        </div>

        <CyberCard className="rounded-4xl p-6">
          <p className="cyber-eyebrow">Compte</p>
          <h3 className="mt-2 cyber-title text-sm text-text">Identifiants</h3>
          <dl className="mt-4 space-y-4 text-sm text-text-muted">
            <div>
              <dt className="text-xs uppercase tracking-[0.2em] text-text-muted">
                Type de compte
              </dt>
              <dd className="mt-1 text-base text-text">
                {user.isGuest ? "Invite" : "Classique"}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.2em] text-text-muted">
                Email
              </dt>
              <dd className="mt-1 text-base text-text">
                {user.isGuest ? "Non renseigne" : user.email}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.2em] text-text-muted">
                Membre depuis
              </dt>
              <dd className="mt-1 text-base text-text">
                {formatJoinedDate(user.createdAt)}
              </dd>
            </div>
          </dl>

          <div className="mt-6">
            <p className="text-xs uppercase tracking-[0.2em] text-text-muted">
              Acces rapide
            </p>
            <div className="mt-3 flex flex-col gap-2">
              <Link to="/conditions-utilisation">
                <SecondaryButton className="w-full">
                  Conditions d'utilisation
                </SecondaryButton>
              </Link>
              <Link to="/politique-confidentialite">
                <SecondaryButton className="w-full">
                  Politique de confidentialite
                </SecondaryButton>
              </Link>
            </div>
          </div>
        </CyberCard>
      </div>
    ),
    quizzes: (
      <CyberCard className="rounded-4xl p-6">
        <p className="cyber-eyebrow">Mes Quizz</p>
        <div className="flex justify-between items-center mt-2">
          <h3 className="cyber-title text-sm text-text">Gerer mes creations</h3>
          <Link to="/admin">
            <PrimaryButton>Nouveau Quiz</PrimaryButton>
          </Link>
        </div>
        <p className="mt-2 text-sm text-text-muted">
          Edite ou supprime les quiz que tu as crees.
        </p>
        {isQuizzesLoading ? (
          <p className="mt-5 text-sm text-text-muted">Chargement...</p>
        ) : myQuizzes.length === 0 ? (
          <p className="mt-5 text-sm text-text-muted">Tu n'as pas encore cree de quiz.</p>
        ) : (
          <ul className="mt-5 space-y-3 text-sm text-text">
            {myQuizzes.map((quiz) => (
              <li
                key={quiz.id}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
              >
                <span>{quiz.title} ({quiz.questions.length} questions)</span>
                <div className="flex items-center gap-2">
                  <Link to={`/admin/${quiz.id}`}>
                    <SecondaryButton>Editer</SecondaryButton>
                  </Link>
                  <SecondaryButton
                    onClick={() => void handleDeleteQuiz(quiz.id)}
                  >
                    Supprimer
                  </SecondaryButton>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CyberCard>
    ),
    history: (
      <CyberCard className="rounded-4xl p-6">
        <p className="cyber-eyebrow">Historique</p>
        <h3 className="mt-2 cyber-title text-sm text-text">
          Dernieres parties
        </h3>
        <p className="mt-2 text-sm text-text-muted">
          Les derniers matchs apparaitront ici, avec filtres par mode et par
          resultat.
        </p>
        <ul className="mt-5 space-y-3 text-sm text-text">
          {["Match 01", "Match 02", "Match 03"].map((label) => (
            <li
              key={label}
              className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
            >
              <span>{label}</span>
              <CyberBadge variant="info">En attente</CyberBadge>
            </li>
          ))}
        </ul>
      </CyberCard>
    ),
    achievements: (
      <CyberCard className="rounded-4xl p-6">
        <p className="cyber-eyebrow">Gamification</p>
        <h3 className="mt-2 cyber-title text-sm text-text">
          Succes et badges
        </h3>
        <p className="mt-2 text-sm text-text-muted">
          Ce module accueillera les badges, rangs et classements globaux.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <CyberBadge variant="info">Badge alpha</CyberBadge>
          <CyberBadge variant="warning">Victoire rapide</CyberBadge>
          <CyberBadge variant="success">Serie x3</CyberBadge>
          <CyberBadge variant="danger">Elite saison</CyberBadge>
        </div>
      </CyberCard>
    ),
    social: (
      <CyberCard className="rounded-4xl p-6">
        <p className="cyber-eyebrow">Social</p>
        <h3 className="mt-2 cyber-title text-sm text-text">
          Amis et messages
        </h3>
        <p className="mt-2 text-sm text-text-muted">
          Retrouve la liste d'amis en ligne et tes conversations privees.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/friends">
            <PrimaryButton>Ouvrir la page amis</PrimaryButton>
          </Link>
          <Link to="/">
            <SecondaryButton>Retourner a l'accueil</SecondaryButton>
          </Link>
        </div>
      </CyberCard>
    ),
    security: (
      <CyberCard className="rounded-4xl p-6">
        <p className="cyber-eyebrow">Securite</p>
        <h3 className="mt-2 cyber-title text-sm text-text">
          Sessions et protection
        </h3>
        <p className="mt-2 text-sm text-text-muted">
          Controle tes sessions actives et ajoute une couche 2FA.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <CyberBadge variant="warning">2FA inactif</CyberBadge>
          <CyberBadge variant="info">Sessions: 1</CyberBadge>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <SecondaryButton disabled>Configurer 2FA</SecondaryButton>
          <SecondaryButton disabled>Voir les sessions</SecondaryButton>
        </div>
      </CyberCard>
    ),
    preferences: (
      <CyberCard className="rounded-4xl p-6">
        <p className="cyber-eyebrow">Preferences</p>
        <h3 className="mt-2 cyber-title text-sm text-text">
          Accessibilite et langue
        </h3>
        <p className="mt-2 text-sm text-text-muted">
          Les options i18n et acces clavier seront configurees ici.
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="block text-sm">
            <span className="text-text-muted">Langue</span>
            <div className="mt-2">
              <CyberSelect disabled>
                <option>Francais</option>
                <option>English</option>
                <option>Espanol</option>
              </CyberSelect>
            </div>
          </label>
          <div>
            <span className="text-sm text-text-muted">
              Accessibilite
            </span>
            <div className="mt-3 flex flex-wrap gap-2">
              <CyberBadge variant="success">Focus visible</CyberBadge>
              <CyberBadge variant="info">ARIA actifs</CyberBadge>
              <CyberBadge variant="warning">Contraste A verifier</CyberBadge>
            </div>
          </div>
        </div>
      </CyberCard>
    ),
  };

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-10 md:px-10">
      <input
        ref={fileInputRef}
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        id="profile-avatar-upload"
        onChange={(event) => void handleAvatarFileChange(event)}
        type="file"
      />

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <CyberPanel className="rounded-4xl p-6">
          <p className="cyber-eyebrow">Profil joueur</p>
          <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center">
            <CyberAvatar
              alt={`Photo de profil de ${user.username}`}
              avatarUrl={user.avatar_url}
              size="lg"
              status={user.status}
              username={user.username}
            />
            <div>
              <h1 className="cyber-title text-2xl text-text">
                {user.username}
              </h1>
              <p className="mt-2 text-sm text-text-muted">
                {formatIdentityLabel(user)}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <CyberBadge
                  variant={user.status === "online" ? "success" : "neutral"}
                >
                  Statut: {user.status}
                </CyberBadge>
                <CyberBadge variant="info">
                  {user.isGuest ? "Mode invite" : "Compte classique"}
                </CyberBadge>
                <CyberBadge variant="warning">
                  Membre depuis {formatJoinedDate(user.createdAt)}
                </CyberBadge>
              </div>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <PrimaryButton
              disabled={isAvatarSubmitting}
              onClick={() => fileInputRef.current?.click()}
              type="button"
            >
              {isAvatarSubmitting ? "Mise a jour..." : "Changer avatar"}
            </PrimaryButton>
            <Link to="/friends">
              <SecondaryButton>Reseau d'amis</SecondaryButton>
            </Link>
          </div>
        </CyberPanel>

        <CyberCard className="rounded-4xl p-6" accent="magenta">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="cyber-eyebrow">Synchronisation</p>
              <h2 className="mt-2 cyber-title text-lg text-text">
                Noyau joueur
              </h2>
              <p className="mt-2 text-sm text-text-muted">
                Statistiques et evenements en temps reel pour les sessions
                actives.
              </p>
            </div>
            <CyberBadge variant="info">Temps reel</CyberBadge>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <CyberStat
              label="Parties jouees"
              value="--"
              hint="Stats a venir"
            />
            <CyberStat
              label="Taux de victoire"
              value="--%"
              hint="Module historique"
            />
            <CyberStat
              label="Classement"
              value="#--"
              hint="Leaderboard"
            />
            <CyberStat
              label="XP"
              value="64/100"
              hint="Progression"
            />
          </div>
          <CyberProgress className="mt-6" label="Experience" value={64} />
        </CyberCard>
      </section>

      <section className="flex flex-col gap-4">
        <CyberTabs
          tabs={profileTabs}
          activeTab={activeTab}
          onChange={setActiveTab}
        />
        <div className="space-y-6">
          {profileTabs.map((tab) => (
            <div
              key={tab.id}
              id={`tab-panel-${tab.id}`}
              role="tabpanel"
              aria-labelledby={`tab-${tab.id}`}
              hidden={activeTab !== tab.id}
            >
              {tabContent[tab.id as keyof typeof tabContent]}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
