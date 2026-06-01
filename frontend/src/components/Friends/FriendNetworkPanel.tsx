import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import type { SafeUser } from "../../services/auth";
import type {
  FriendOverview,
  PrivateConversationSummary,
} from "../../services/users";
import { CyberAvatar, CyberBadge, CyberButton, CyberCard } from "../cyber";
import Section from "../section";
import SectionHeader from "../section-header";
import SectionLabel from "../section-label";
import PrimaryButton from "../ui/PrimaryButton";
import SecondaryButton from "../ui/SecondaryButton";
import EmptyCard from "../ui/empty-card";
import Input from "../ui/input";

export type FriendNotice = {
  kind: "success" | "error";
  message: string;
};

type FriendNetworkPanelProps = {
  currentUser: SafeUser;
  friendOverview: FriendOverview | null;
  friendsError: string | null;
  isFriendsLoading: boolean;
  friendUsername: string;
  onFriendUsernameChange: (value: string) => void;
  onFriendSubmit: (event: FormEvent<HTMLFormElement>) => void;
  friendNotice: FriendNotice | null;
  isSendingRequest: boolean;
  pendingActionId: number | null;
  onFriendRequestAction: (
    requestId: number,
    action: "accepted" | "declined",
  ) => void;
  pendingRemovalFriendId: number | null;
  onFriendRemoval: (friendId: number) => void;
  selectedFriendId: number | null;
  onSelectFriend: (friendId: number) => void;
  conversationSummariesByFriendId: Record<number, PrivateConversationSummary>;
  usernameMinLength: number;
};

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return value;
  }
}

function formatStatus(status: "online" | "offline") {
  return status === "online" ? "En ligne" : "Hors ligne";
}

export default function FriendNetworkPanel({
  currentUser,
  friendOverview,
  friendsError,
  isFriendsLoading,
  friendUsername,
  onFriendUsernameChange,
  onFriendSubmit,
  friendNotice,
  isSendingRequest,
  pendingActionId,
  onFriendRequestAction,
  pendingRemovalFriendId,
  onFriendRemoval,
  selectedFriendId,
  onSelectFriend,
  conversationSummariesByFriendId,
  usernameMinLength,
}: FriendNetworkPanelProps) {
  return (
    <Section>
      {currentUser.isGuest ? (
        <CyberCard className="mt-8 rounded-[1.75rem] p-6" accent="magenta">
          <p className="cyber-eyebrow">Acces limite</p>
          <h3 className="mt-2 cyber-title text-lg text-text">
            Compte invite detecte
          </h3>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-text-muted">
            Les amis et les messages prives sont reserves aux comptes classiques
            pour conserver ton reseau d'une session a l'autre.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <CyberBadge variant="warning">Invite</CyberBadge>
            <Link to="/register">
              <PrimaryButton>Creer un compte classique</PrimaryButton>
            </Link>
          </div>
        </CyberCard>
      ) : (
        <>
          <CyberCard className="rounded-3xl p-5" accent="cyan">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="cyber-title text-lg text-text">Liste d'amis</h3>
                <p className="mt-2 text-sm leading-7 text-text-muted">
                  Ouvre une conversation privee ou consulte l'activite recente.
                </p>
              </div>
              <CyberBadge variant="info">
                {friendOverview?.friends.length ?? 0} contact
                {(friendOverview?.friends.length ?? 0) > 1 ? "s" : ""}
              </CyberBadge>
            </div>

            {friendsError ? (
              <div className="mt-5 rounded-3xl border border-danger/30 bg-danger/10 px-5 py-4 text-sm text-danger">
                {friendsError}
              </div>
            ) : null}

            {isFriendsLoading && !friendOverview ? (
              <div className="mt-5 rounded-3xl border border-white/10 bg-white/5 px-5 py-5 text-sm text-text-muted">
                Chargement de ta liste d'amis...
              </div>
            ) : null}

            {!friendsError &&
              !isFriendsLoading &&
              (friendOverview?.friends.length ?? 0) === 0 ? (
              <EmptyCard className="py-3!">
                Aucun ami pour l'instant. Commence par rechercher un joueur avec
                son pseudo.
              </EmptyCard>
            ) : null}

            <div className="mt-5 space-y-3">
              {friendOverview?.friends.map((friend) => {
                const summary = conversationSummariesByFriendId[friend.id];
                const isSelected = selectedFriendId === friend.id;
                const isRemoving = pendingRemovalFriendId === friend.id;

                return (
                  <div
                    key={friend.id}
                    className={`w-full rounded-3xl border px-5 py-4 text-left transition ${isSelected
                        ? "border-primary/50 bg-white/12"
                        : "border-white/10 bg-white/6 hover:bg-white/10"
                      }`}
                  >
                    <button
                      className="w-full text-left"
                      type="button"
                      onClick={() => onSelectFriend(friend.id)}
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center gap-4">
                          <CyberAvatar
                            alt={`Photo de profil de ${friend.username}`}
                            avatarUrl={friend.avatar_url}
                            size="md"
                            status={friend.status}
                            username={friend.username}
                          />
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-lg font-semibold text-text">
                                {friend.username}
                              </p>
                              {summary?.unreadCount ? (
                                <CyberBadge variant="warning">
                                  {summary.unreadCount} nouveau
                                  {summary.unreadCount > 1 ? "x" : ""}
                                </CyberBadge>
                              ) : null}
                            </div>
                            <p className="mt-1 text-sm text-text-muted">
                              {formatStatus(friend.status)} • inscrit le{" "}
                              {formatDate(friend.createdAt)}
                            </p>
                            <p className="mt-2 text-sm text-text-muted">
                              {summary?.lastMessagePreview ??
                                "Aucun message privé échangé pour le moment."}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-start gap-2 md:items-end">
                          <CyberBadge
                            variant={
                              friend.status === "online" ? "success" : "info"
                            }
                          >
                            {formatStatus(friend.status)}
                          </CyberBadge>
                          <span className="text-sm text-text-muted">
                            {summary?.lastMessageAt
                              ? `Dernier message le ${formatDate(summary.lastMessageAt)}`
                              : "Conversation vide"}
                          </span>
                        </div>
                      </div>
                    </button>
                    <div className="mt-4 flex justify-end">
                      <CyberButton
                        className="px-4 py-2 text-xs"
                        glow={false}
                        size="sm"
                        variant="danger"
                        disabled={isRemoving}
                        onClick={() => void onFriendRemoval(friend.id)}
                      >
                        {isRemoving ? "Retrait..." : "Retirer"}
                      </CyberButton>
                    </div>
                  </div>
                );
              })}
            </div>
          </CyberCard>

          <Section className="mt-5">
            <form
              aria-busy={isSendingRequest}
              onSubmit={(event) => void onFriendSubmit(event)}
            >
              <SectionHeader className="mt-0!">Ajouter un ami</SectionHeader>
              <p className="mt-2 text-sm leading-7 text-text-muted">
                Saisis un pseudo exact. Si ce joueur t'a déjà envoyé une
                demande, elle sera acceptée automatiquement.
              </p>
              <label
                className="mb-2 mt-5 block text-sm font-medium text-text-muted"
                htmlFor="friend-username"
              >
                Pseudo du joueur
              </label>
              <Input
                className="w-full"
                id="friend-username"
                type="text"
                placeholder="Exemple: theo42"
                value={friendUsername}
                onChange={(event) => onFriendUsernameChange(event.target.value)}
                disabled={isSendingRequest}
                minLength={usernameMinLength}
                autoComplete="friend-username"
                required
              />
              <PrimaryButton
                className="mt-4 w-full justify-center"
                disabled={isSendingRequest || friendUsername.length < 1}
                type="submit"
              >
                {isSendingRequest ? "Envoi..." : "Ajouter par pseudo"}
              </PrimaryButton>
              {friendNotice ? (
                <p
                  className={`mt-4 rounded-[1.25rem] border px-4 py-3 text-sm ${friendNotice.kind === "success"
                      ? "border-success/30 bg-success/10 text-success"
                      : "border-danger/30 bg-danger/10 text-danger"
                    }`}
                  role="alert"
                >
                  {friendNotice.message}
                </p>
              ) : null}
            </form>
          </Section>

          <Section className="mt-5">
            <div className="flex items-center justify-between gap-3">
              <SectionLabel className="text-text-muted">
                Demandes recues
              </SectionLabel>
              {isFriendsLoading ? (
                <span className="text-xs text-text-muted">Chargement...</span>
              ) : null}
            </div>

            {friendsError ? (
              <p className="mt-4 text-sm text-danger">{friendsError}</p>
            ) : null}

            {!friendsError &&
              !isFriendsLoading &&
              (friendOverview?.receivedRequests.length ?? 0) === 0 ? (
              <EmptyCard>Aucune demande en attente pour le moment.</EmptyCard>
            ) : null}

            <div className="mt-4 space-y-3">
              {friendOverview?.receivedRequests.map((request) => (
                <div
                  key={request.id}
                  className="rounded-[1.25rem] border border-white/10 bg-white/6 px-4 py-4 text-text shadow-[0_16px_40px_rgba(15,23,42,0.18)]"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-base font-semibold text-text">
                        {request.user.username}
                      </p>
                      <p className="mt-1 text-sm text-text-muted">
                        Recue le {formatDate(request.createdAt)}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <PrimaryButton
                        className="justify-center px-5 py-2.5"
                        disabled={pendingActionId === request.id}
                        onClick={() =>
                          void onFriendRequestAction(request.id, "accepted")
                        }
                      >
                        {pendingActionId === request.id
                          ? "Traitement..."
                          : "Accepter"}
                      </PrimaryButton>
                      <SecondaryButton
                        className="px-5 py-2.5"
                        disabled={pendingActionId === request.id}
                        onClick={() =>
                          void onFriendRequestAction(request.id, "declined")
                        }
                      >
                        Refuser
                      </SecondaryButton>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section className="mt-5">
            <SectionLabel className="text-text-muted">
              Demandes envoyées
            </SectionLabel>

            {!isFriendsLoading &&
              (friendOverview?.sentRequests.length ?? 0) === 0 ? (
              <EmptyCard>Aucune demande envoyée en attente.</EmptyCard>
            ) : null}

            <div className="mt-4 space-y-3">
              {friendOverview?.sentRequests.map((request) => (
                <div
                  key={request.id}
                  className="rounded-[1.25rem] border border-white/10 bg-white/6 px-4 py-4 text-text shadow-[0_16px_40px_rgba(15,23,42,0.18)]"
                >
                  <p className="text-base font-semibold text-text">
                    {request.user.username}
                  </p>
                  <p className="mt-1 text-sm text-text-muted">
                    En attente depuis le {formatDate(request.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          </Section>
        </>
      )}
    </Section>
  );
}
