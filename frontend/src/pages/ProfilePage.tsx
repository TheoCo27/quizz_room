import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { SafeUser } from "../services/auth";
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
import { getUserFacingErrorMessage, ApiRequestError } from "../services/api";
import {
  AUTH_USERNAME_MAX_LENGTH,
  AUTH_USERNAME_MIN_LENGTH,
} from "../services/auth";
import { getUserWinsRank, type UserWinsRank } from "../services/scores";
import { getUserById, updateMyAvatar, updateMyProfile } from "../services/users";
import {
  normalizeInput,
  validateUsername,
} from "../utils/input-validation";
import { calculateLevelData } from "../utils/level";

import { getQuizzes, getMyQuizzes, deleteQuiz, type Quiz } from "../services/quizzes";
import { createRoom } from "../services/rooms";

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
  | "quizzes"
  | "discover_quizzes";

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

function formatIdentityLabel(user: { email?: string; isGuest: boolean }, isOwnProfile = false) {
  if (user.isGuest) {
    return "Compte invite";
  }

  return isOwnProfile && user.email ? user.email : "Compte classique";
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
  const { userId } = useParams<{ userId?: string }>();
  const isOwnProfile = !userId;

  const { user, isLoading, refreshSession } = useAuthSession();
  const navigate = useNavigate();
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
  const [allQuizzes, setAllQuizzes] = useState<Quiz[]>([]);
  const [isAllQuizzesLoading, setIsAllQuizzesLoading] = useState(false);
  const [winsRankData, setWinsRankData] = useState<UserWinsRank | null>(null);

  // States for target user (when viewing another player's profile)
  const [targetUser, setTargetUser] = useState<SafeUser | null>(null);
  const [isTargetUserLoading, setIsTargetUserLoading] = useState(false);
  const [targetUserError, setTargetUserError] = useState<string | null>(null);

  const displayedUser = isOwnProfile ? user : targetUser;
  const isProfileLoading = isOwnProfile ? isLoading : isTargetUserLoading;

  const levelData = calculateLevelData(displayedUser?.xp ?? 0);

  // Fetch target user if not own profile
  useEffect(() => {
    if (isOwnProfile) {
      setTargetUser(null);
      setTargetUserError(null);
      return;
    }

    setIsTargetUserLoading(true);
    setTargetUserError(null);
    getUserById(Number(userId))
      .then((data) => {
        setTargetUser(data);
      })
      .catch((err) => {
        setTargetUserError("Impossible de charger le profil de cet utilisateur.");
        console.error(err);
      })
      .finally(() => {
        setIsTargetUserLoading(false);
      });
  }, [userId, isOwnProfile]);

  useEffect(() => {
    if (isOwnProfile && user) {
      setProfileUsername(user.username);
      setProfileStatus(user.status);
    }
  }, [user, isOwnProfile]);

  useEffect(() => {
    const activeUserId = isOwnProfile ? user?.id : Number(userId);
    if (!activeUserId) {
      setWinsRankData(null);
      return;
    }

    getUserWinsRank(activeUserId)
      .then(setWinsRankData)
      .catch(() => setWinsRankData(null));
  }, [user?.id, userId, isOwnProfile]);

  useEffect(() => {
    if (activeTab === "quizzes") {
      setIsQuizzesLoading(true);
      getMyQuizzes()
        .then(setMyQuizzes)
        .catch(console.error)
        .finally(() => setIsQuizzesLoading(false));
    } else if (activeTab === "discover_quizzes") {
      setIsAllQuizzesLoading(true);
      getQuizzes()
        .then(setAllQuizzes)
        .catch(console.error)
        .finally(() => setIsAllQuizzesLoading(false));
    }
  }, [activeTab]);

  const handleLaunchQuiz = async (quizId: number) => {
    try {
      const room = await createRoom({
        gameType: "QUIZ",
        maxPlayers: 5,
        quizId,
      });
      navigate(`/room/${room.id}`);
    } catch (error) {
      alert(getUserFacingErrorMessage(error, "Impossible de lancer la partie."));
    }
  };

  const handleDeleteQuiz = async (quizId: number) => {
    if (!window.confirm("Voulez-vous vraiment supprimer ce quiz ?")) return;
    try {
      await deleteQuiz(quizId);
      setMyQuizzes((prev) => prev.filter((q) => q.id !== quizId));
    } catch (error) {
      alert(getUserFacingErrorMessage(error, "Impossible de supprimer le quiz."));
    }
  };

  if (isProfileLoading) {
    return (
      <main className="mx-auto flex w-full max-w-6xl flex-1 px-6 py-10 md:px-10">
        <CyberCard className="w-full p-8">
          <p className="cyber-eyebrow">Dossier Neuro</p>
          <h1 className="mt-4 cyber-title text-xl text-text">
            Chargement du dossier neuro...
          </h1>
        </CyberCard>
      </main>
    );
  }

  if (targetUserError) {
    return (
      <main className="mx-auto flex w-full max-w-6xl flex-1 px-6 py-10 md:px-10">
        <CyberPanel className="w-full rounded-[2.5rem] p-8">
          <p className="cyber-eyebrow">Dossier Neuro</p>
          <h1 className="mt-4 cyber-title text-3xl text-text">
            Cyber-alias non répertorié
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-text-muted">
            {targetUserError}
          </p>
          <div className="mt-6">
            <SecondaryButton onClick={() => navigate(-1)}>
              Retour
            </SecondaryButton>
          </div>
        </CyberPanel>
      </main>
    );
  }

  if (!displayedUser) {
    return (
      <main className="mx-auto flex w-full max-w-6xl flex-1 px-6 py-10 md:px-10">
        <CyberPanel className="w-full rounded-[2.5rem] p-8">
          <p className="cyber-eyebrow">Dossier Neuro</p>
          <h1 className="mt-4 cyber-title text-3xl text-text">
            Connexion requise // sub-net
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-text-muted">
            Initialise ta connexion pour accéder à ton dossier neurologique et synchroniser ton cyberdeck.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link to="/login">
              <PrimaryButton>Se connecter</PrimaryButton>
            </Link>
            <Link to="/register">
              <SecondaryButton>Créer un compte</SecondaryButton>
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
      let message = "";
      if (error instanceof ApiRequestError && error.status === 400) {
        message = "Format de fichier invalide ou fichier trop volumineux";
      } else {
        message = getUserFacingErrorMessage(
          error,
          "Impossible de mettre a jour la photo de profil.",
        ) ?? "Impossible de mettre a jour la photo de profil.";
      }
      setAvatarNotice({
        kind: "error",
        message,
      });
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

    const trimmedUsername = normalizeInput(profileUsername);
    setProfileNotice(null);

    const usernameError = validateUsername(trimmedUsername);

    if (usernameError) {
      setProfileNotice({
        kind: "error",
        message: usernameError,
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
      let message = "";
      if (error instanceof ApiRequestError && error.status === 409) {
        message = "Ce nom d'utilisateur est déjà pris";
      } else {
        message = getUserFacingErrorMessage(
          error,
          "Impossible de mettre a jour le profil.",
        ) ?? "Impossible de mettre a jour le profil.";
      }
      setProfileNotice({
        kind: "error",
        message,
      });
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
    user && (profileUsername.trim() !== user.username || profileStatus !== user.status);

  const profileTabs: Array<{ id: ProfileTabId; label: string }> = isOwnProfile
    ? [
        { id: "overview", label: "Profil" },
        { id: "discover_quizzes", label: "Découvrir des quiz" },
        { id: "quizzes", label: "Mes quiz" },
        { id: "history", label: "Historique" },
        { id: "achievements", label: "Succès" },
        { id: "social", label: "Amis" },
        { id: "security", label: "Sécurité" },
        { id: "preferences", label: "Préférences" },
      ]
    : [
        { id: "overview", label: "Profil" },
        { id: "history", label: "Historique" },
        { id: "achievements", label: "Succès" },
      ];

  const tabContent = {
    overview: isOwnProfile && user ? (
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="flex flex-col gap-6">
          <CyberCard className="rounded-4xl p-6">
            <p className="cyber-eyebrow">Lien synaptique</p>
            <h3 className="mt-2 cyber-title text-sm text-text">
              Hologramme et présence
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
                  Transmets une empreinte holographique (JPG, PNG, WEBP, max 2 Mo).
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <PrimaryButton
                    disabled={isAvatarSubmitting}
                    onClick={() => fileInputRef.current?.click()}
                    type="button"
                  >
                    {isAvatarSubmitting
                      ? "Chiffrage..."
                      : "Changer la photo"}
                  </PrimaryButton>
                  <SecondaryButton
                    disabled={isAvatarSubmitting || !user.avatar_url}
                    onClick={() => void handleAvatarRemove()}
                    type="button"
                  >
                    Supprimer la photo
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
            <p className="cyber-eyebrow">Diagnostic Neuro</p>
            <h3 className="mt-2 cyber-title text-sm text-text">
              Alias et statut réseau
            </h3>
            <form
              className="mt-4 space-y-4"
              onSubmit={(event) => void handleProfileSubmit(event)}
            >
              <label className="block">
                <span className="text-sm font-medium">Alias Réseau</span>
                <Input
                  className="mt-2 w-full"
                  type="text"
                  maxLength={AUTH_USERNAME_MAX_LENGTH}
                  minLength={AUTH_USERNAME_MIN_LENGTH}
                  onChange={(event) => setProfileUsername(event.target.value)}
                  placeholder="Nouvel alias"
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
                    ? "Chiffrage..."
                    : "Sauvegarder"}
                </PrimaryButton>
                <SecondaryButton
                  disabled={isProfileSubmitting || !hasProfileChanges}
                  onClick={handleProfileReset}
                  type="button"
                >
                  Réinitialiser
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
          <p className="cyber-eyebrow">Accréditation</p>
          <h3 className="mt-2 cyber-title text-sm text-text">Clés d'accès</h3>
          <dl className="mt-4 space-y-4 text-sm text-text-muted">
            <div>
              <dt className="text-xs uppercase tracking-[0.2em] text-text-muted">
                Niveau d'accréditation
              </dt>
              <dd className="mt-1 text-base text-text font-bold">
                {user.isGuest ? "Accès furtif (Invité)" : "Profil enregistré"}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.2em] text-text-muted">
                Email
              </dt>
              <dd className="mt-1 text-base text-text">
                {user.isGuest ? "Non renseigné" : user.email}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.2em] text-text-muted">
                Première synchronisation
              </dt>
              <dd className="mt-1 text-base text-text">
                {formatJoinedDate(user.createdAt)}
              </dd>
            </div>
          </dl>

          <div className="mt-6">
            <p className="text-xs uppercase tracking-[0.2em] text-text-muted">
              Protocoles réseau
            </p>
            <div className="mt-3 flex flex-col gap-2">
              <Link to="/conditions-utilisation">
                <SecondaryButton className="w-full">
                  Protocoles d'utilisation
                </SecondaryButton>
              </Link>
              <Link to="/politique-confidentialite">
                <SecondaryButton className="w-full">
                  Directives de confidentialité
                </SecondaryButton>
              </Link>
            </div>
          </div>
        </CyberCard>
      </div>
    ) : (
      <div className="grid gap-6 lg:grid-cols-2">
        <CyberCard className="rounded-4xl p-6">
          <p className="cyber-eyebrow">Identité</p>
          <h3 className="mt-2 cyber-title text-sm text-text">Informations de compte</h3>
          <dl className="mt-4 space-y-4 text-sm text-text-muted">
            <div>
              <dt className="text-xs uppercase tracking-[0.2em] text-text-muted">
                Type de compte
              </dt>
              <dd className="mt-1 text-base text-text font-bold">
                {displayedUser?.isGuest ? "Invitée" : "Classique"}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.2em] text-text-muted">
                Statut actuel
              </dt>
              <dd className="mt-1 text-base text-text capitalize">
                <span className="inline-flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${displayedUser?.status === "online" ? "bg-success animate-pulse" : "bg-neutral-500"}`} />
                  {displayedUser?.status || "offline"}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.2em] text-text-muted">
                Membre depuis
              </dt>
              <dd className="mt-1 text-base text-text">
                {displayedUser?.createdAt ? formatJoinedDate(displayedUser.createdAt) : "--"}
              </dd>
            </div>
          </dl>
        </CyberCard>

        <CyberCard className="rounded-4xl p-6" accent="lime">
          <p className="cyber-eyebrow">Progression</p>
          <h3 className="mt-2 cyber-title text-sm text-text">Expérience et Niveau</h3>
          <dl className="mt-4 space-y-4 text-sm text-text-muted">
            <div>
              <dt className="text-xs uppercase tracking-[0.2em] text-text-muted">
                Niveau actuel
              </dt>
              <dd className="mt-1 text-base text-text font-bold text-lime">
                Niveau {levelData.level}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.2em] text-text-muted">
                XP Cumulé
              </dt>
              <dd className="mt-1 text-base text-text font-medium">
                {displayedUser?.xp ?? 0} XP
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.2em] text-text-muted">
                Progression niveau
              </dt>
              <dd className="mt-1 text-base text-text">
                {levelData.xpInCurrentLevel} / {levelData.xpRequiredForNextLevel} XP ({levelData.percentage}%)
              </dd>
            </div>
          </dl>
        </CyberCard>
      </div>
    ),
    quizzes: (
      <CyberCard className="rounded-4xl p-6">
        <p className="cyber-eyebrow">Mes quiz</p>
        <div className="flex justify-between items-center mt-2">
          <h3 className="cyber-title text-sm text-text">Gérer mes quiz</h3>
          <Link to="/admin">
            <PrimaryButton>Créer un quiz</PrimaryButton>
          </Link>
        </div>
        <p className="mt-2 text-sm text-text-muted">
          Modifie ou efface les éclats enregistrés dans ton cyberdeck.
        </p>
        {isQuizzesLoading ? (
          <p className="mt-5 text-sm text-text-muted">Décryptage en cours...</p>
        ) : myQuizzes.length === 0 ? (
          <p className="mt-5 text-sm text-text-muted">Aucun éclat encodé détecté.</p>
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
                    <SecondaryButton>Modifier</SecondaryButton>
                  </Link>
                  <SecondaryButton
                    onClick={() => void handleDeleteQuiz(quiz.id)}
                  >
                    Effacer
                  </SecondaryButton>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CyberCard>
    ),
    discover_quizzes: (
      <CyberCard className="rounded-4xl p-6" accent="magenta">
        <p className="cyber-eyebrow">Réseau d'éclats</p>
        <h3 className="mt-2 cyber-title text-sm text-text">
          Quiz disponibles
        </h3>
        <p className="mt-2 text-sm text-text-muted">
          Recherche des éclats sur le sous-réseau public et lance une synchronisation réseau.
        </p>
        {isAllQuizzesLoading ? (
          <p className="mt-5 text-sm text-text-muted">Décryptage en cours...</p>
        ) : allQuizzes.length === 0 ? (
          <p className="mt-5 text-sm text-text-muted">Aucun éclat détecté sur le serveur.</p>
        ) : (
          <ul className="mt-5 space-y-3 text-sm text-text">
            {allQuizzes.map((quiz) => {
              const isOwner = quiz.authorId === user?.id;
              return (
                <li
                  key={quiz.id}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                >
                  <div className="flex flex-col">
                    <span className="font-bold text-text">{quiz.title}</span>
                    <span className="text-xs text-text-muted">
                      {quiz.questions.length} question{quiz.questions.length > 1 ? "s" : ""} | Créé par :{" "}
                      <span className="text-secondary font-bold">
                        {quiz.author?.username || "Système"}
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <PrimaryButton
                      onClick={() => void handleLaunchQuiz(quiz.id)}
                    >
                      Jouer ce quiz
                    </PrimaryButton>
                    {isOwner && (
                      <>
                        <Link to={`/admin/${quiz.id}`}>
                          <SecondaryButton>Modifier</SecondaryButton>
                        </Link>
                        <SecondaryButton
                          onClick={() => void handleDeleteQuiz(quiz.id)}
                        >
                          Effacer
                        </SecondaryButton>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CyberCard>
    ),
    history: (
      <CyberCard className="rounded-4xl p-6">
        <p className="cyber-eyebrow">Historique</p>
        <h3 className="mt-2 cyber-title text-sm text-text">
          Dernières connexions
        </h3>
        <p className="mt-2 text-sm text-text-muted">
          Les dernières transmissions réseau apparaîtront ici, triées par protocole et état de liaison.
        </p>
        <ul className="mt-5 space-y-3 text-sm text-text">
          {["Trans. 01", "Trans. 02", "Trans. 03"].map((label) => (
            <li
              key={label}
              className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
            >
              <span>{label}</span>
              <CyberBadge variant="info">Archivé</CyberBadge>
            </li>
          ))}
        </ul>
      </CyberCard>
    ),
    achievements: (
      <CyberCard className="rounded-4xl p-6">
        <p className="cyber-eyebrow">Succès</p>
        <h3 className="mt-2 cyber-title text-sm text-text">
          Succès et distinctions
        </h3>
        <p className="mt-2 text-sm text-text-muted">
          Cette matrice affiche tes badges de combat et ton niveau de réputation dans Night City.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <CyberBadge variant="info">Badge Alpha</CyberBadge>
          <CyberBadge variant="warning">Hack Éclair</CyberBadge>
          <CyberBadge variant="success">Série Neurologique x3</CyberBadge>
          <CyberBadge variant="danger">Élite du Sub-Net</CyberBadge>
        </div>
      </CyberCard>
    ),
    social: (
      <CyberCard className="rounded-4xl p-6">
        <p className="cyber-eyebrow">Amis</p>
        <h3 className="mt-2 cyber-title text-sm text-text">
          Amis et messages
        </h3>
        <p className="mt-2 text-sm text-text-muted">
          Retrouve la liste de tes Chooms actifs et tes flux Holocall sécurisés.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/friends">
            <PrimaryButton>Voir mes amis</PrimaryButton>
          </Link>
          <Link to="/">
            <SecondaryButton>Retourner à l'accueil</SecondaryButton>
          </Link>
        </div>
      </CyberCard>
    ),
    security: (
      <CyberCard className="rounded-4xl p-6">
        <p className="cyber-eyebrow">Sécurité</p>
        <h3 className="mt-2 cyber-title text-sm text-text">
          Noyau de sécurité neuronale
        </h3>
        <p className="mt-2 text-sm text-text-muted">
          Supervise tes terminaux actifs et configure le protocole d'authentification double facteur (2FA).
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <CyberBadge variant="warning">2FA désactivé</CyberBadge>
          <CyberBadge variant="info">Terminaux liés: 1</CyberBadge>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <SecondaryButton disabled>Activer cryptage 2FA</SecondaryButton>
          <SecondaryButton disabled>Superviser terminaux</SecondaryButton>
        </div>
      </CyberCard>
    ),
    preferences: (
      <CyberCard className="rounded-4xl p-6">
        <p className="cyber-eyebrow">Préférences</p>
        <h3 className="mt-2 cyber-title text-sm text-text">
          Interface & Synapses
        </h3>
        <p className="mt-2 text-sm text-text-muted">
          Ajuste les paramètres d'interface neuronale et les protocoles de traduction.
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="block text-sm">
            <span className="text-text-muted">Code Linguistique</span>
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
              Flux sensoriel
            </span>
            <div className="mt-3 flex flex-wrap gap-2">
              <CyberBadge variant="success">Focus Rétinien</CyberBadge>
              <CyberBadge variant="info">Assistance Synaptique</CyberBadge>
              <CyberBadge variant="warning">Contraste Réseau</CyberBadge>
            </div>
          </div>
        </div>
      </CyberCard>
    ),
  };

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-10 md:px-10">
      {isOwnProfile && (
        <input
          ref={fileInputRef}
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          id="profile-avatar-upload"
          onChange={(event) => void handleAvatarFileChange(event)}
          type="file"
        />
      )}

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <CyberPanel className="rounded-4xl p-6">
          <p className="cyber-eyebrow">Dossier Opérateur</p>
          <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center">
            <CyberAvatar
              alt={`Hologramme de ${displayedUser?.username}`}
              avatarUrl={displayedUser?.avatar_url}
              size="lg"
              status={displayedUser?.status}
              username={displayedUser?.username || ""}
            />
            <div>
              <h1 className="cyber-title text-2xl text-text">
                {displayedUser?.username}
              </h1>
              <p className="mt-2 text-sm text-text-muted">
                {displayedUser ? formatIdentityLabel(displayedUser, isOwnProfile) : ""}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <CyberBadge
                  variant={displayedUser?.status === "online" ? "success" : "neutral"}
                >
                  Statut: {displayedUser?.status}
                </CyberBadge>
                <CyberBadge variant="info">
                  {displayedUser?.isGuest ? "Liaison Furtive (Invité)" : "Accréditation Standard"}
                </CyberBadge>
                <CyberBadge variant="success">
                  Street Cred {levelData.level}
                </CyberBadge>
                <CyberBadge variant="warning">
                  Synchronisé depuis {displayedUser?.createdAt ? formatJoinedDate(displayedUser.createdAt) : ""}
                </CyberBadge>
              </div>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            {isOwnProfile ? (
              <>
                <PrimaryButton
                  disabled={isAvatarSubmitting}
                  onClick={() => fileInputRef.current?.click()}
                  type="button"
                >
                  {isAvatarSubmitting ? "Chiffrage..." : "Changer la photo"}
                </PrimaryButton>
                <Link to="/friends">
                  <SecondaryButton>Amis</SecondaryButton>
                </Link>
              </>
            ) : (
              <SecondaryButton onClick={() => navigate(-1)}>
                Retour
              </SecondaryButton>
            )}
          </div>
        </CyberPanel>

        <CyberCard className="rounded-4xl p-6" accent="magenta">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="cyber-eyebrow">Synchronisation</p>
              <h2 className="mt-2 cyber-title text-lg text-text">
                Noyau de données
              </h2>
              <p className="mt-2 text-sm text-text-muted">
                Supervision des flux neuronaux et historiques d'accès au réseau.
              </p>
            </div>
            <CyberBadge variant="info">Temps Réel</CyberBadge>
          </div>
          <div className="mt-6 grid gap-4 grid-cols-2 md:grid-cols-3">
            <CyberStat
              label="Contrats Remplis"
              value={winsRankData ? winsRankData.totalWins.toString() : "--"}
              hint="Légendes du Réseau"
            />
            <CyberStat
              label="Synchronisations"
              value={winsRankData ? winsRankData.gamesPlayed.toString() : "--"}
              hint="Terminal historique"
            />
            <CyberStat
              label="Taux de Réussite"
              value={winsRankData && winsRankData.gamesPlayed > 0 
                ? `${Math.round((winsRankData.totalWins / winsRankData.gamesPlayed) * 100)}%` 
                : "--%"
              }
              hint="Ratio de réussite"
            />
            <CyberStat
              label="Street Cred"
              value={winsRankData ? `#${winsRankData.rank}` : "#--"}
              hint="Légendes"
            />
            <CyberStat
              label="Niveau"
              value={`Cred ${levelData.level}`}
              hint={`${levelData.xpInCurrentLevel}/${levelData.xpRequiredForNextLevel} XP`}
            />
          </div>
          <CyberProgress className="mt-6" label={`Street Cred ${levelData.level}`} value={levelData.percentage} />
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
