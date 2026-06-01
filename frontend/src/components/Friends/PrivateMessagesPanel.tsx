import type { FormEvent } from "react";
import type { FriendUserSummary, PrivateMessage } from "../../services/users";
import { CyberBadge, CyberCard } from "../cyber";
import PrimaryButton from "../ui/PrimaryButton";
import Input from "../ui/input";

const PRIVATE_MESSAGE_MAX_LENGTH = 1000;

type PrivateMessagesPanelProps = {
  currentUserId: number;
  selectedFriend: FriendUserSummary | null;
  messages: PrivateMessage[];
  isConversationLoading: boolean;
  conversationError: string | null;
  messageInput: string;
  onMessageInputChange: (value: string) => void;
  onMessageSubmit: (event: FormEvent<HTMLFormElement>) => void;
  isSendingMessage: boolean;
};

function formatTimestamp(value: string) {
  try {
    return new Date(value).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

export default function PrivateMessagesPanel({
  currentUserId,
  selectedFriend,
  messages,
  isConversationLoading,
  conversationError,
  messageInput,
  onMessageInputChange,
  onMessageSubmit,
  isSendingMessage,
}: PrivateMessagesPanelProps) {
  const hasReachedMessageLimit =
    messageInput.length >= PRIVATE_MESSAGE_MAX_LENGTH;

  return (
    <CyberCard className="flex min-h-176 flex-col rounded-4xl p-6" accent="magenta">
      <div className="border-b border-white/10 pb-5">
        <p className="cyber-eyebrow">Messages prives</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h2 className="cyber-title text-2xl text-text">
            {selectedFriend ? selectedFriend.username : "Choisis un ami"}
          </h2>
          {selectedFriend ? (
            <CyberBadge variant="info">Canal prive</CyberBadge>
          ) : null}
        </div>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-text-muted">
          {selectedFriend
            ? "La conversation privee est reservee aux amis acceptes."
            : "Selectionne un ami dans le reseau pour ouvrir ou reprendre une conversation."}
        </p>
      </div>

      {selectedFriend ? (
        <>
          <div className="mt-5 flex-1 space-y-3 overflow-y-auto rounded-[1.75rem] border border-white/10 bg-white/5 p-4">
            {isConversationLoading ? (
              <div className="rounded-[1.25rem] border border-white/10 bg-white/8 px-4 py-4 text-sm text-text-muted">
                Chargement de la conversation...
              </div>
            ) : null}

            {conversationError ? (
              <div className="rounded-[1.25rem] border border-danger/30 bg-danger/10 px-4 py-4 text-sm text-danger">
                {conversationError}
              </div>
            ) : null}

            {!isConversationLoading &&
              !conversationError &&
              messages.length === 0 ? (
              <div className="rounded-[1.25rem] border border-white/10 bg-white/8 px-4 py-4 text-sm leading-7 text-text-muted">
                Aucun message pour l'instant. Lance la conversation avec{" "}
                {selectedFriend.username}.
              </div>
            ) : null}

            {messages.map((message) => {
              const isOwnMessage = message.senderId === currentUserId;

              return (
                <div
                  key={message.id}
                  className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-[1.4rem] border px-4 py-3 shadow-sm ${isOwnMessage
                        ? "border-primary/40 bg-primary/10 text-text"
                        : "border-white/10 bg-white/8 text-text"
                      }`}
                  >
                    <p className="whitespace-pre-wrap text-sm leading-7">
                      {message.content}
                    </p>
                    <div
                      className={`mt-2 flex items-center gap-2 text-xs ${isOwnMessage ? "text-text-muted" : "text-text-muted"
                        }`}
                    >
                      <span>{formatTimestamp(message.createdAt)}</span>
                      {isOwnMessage ? (
                        <span>{message.readAt ? "Lu" : "Envoye"}</span>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <form
            className="mt-5"
            onSubmit={(event) => void onMessageSubmit(event)}
          >
            <label
              className="mb-2 block text-sm font-medium text-text-muted"
              htmlFor="private-message"
            >
              Ecrire a {selectedFriend.username}
            </label>
            <Input
              className="w-full"
              id="private-message"
              placeholder="Ecris un message privé..."
              value={messageInput}
              onChange={(event) => onMessageInputChange(event.target.value)}
              disabled={isSendingMessage}
              maxLength={PRIVATE_MESSAGE_MAX_LENGTH}
              required
            />
            {hasReachedMessageLimit ? (
              <p className="mt-3 rounded-[1.25rem] border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
                Attention : le message a ete tronque. Maximum{" "}
                {PRIVATE_MESSAGE_MAX_LENGTH} caracteres.
              </p>
            ) : null}
            <div className="mt-4 flex justify-end">
              <PrimaryButton
                disabled={isSendingMessage || messageInput.length < 1}
                type="submit"
              >
                {isSendingMessage ? "Envoi..." : "Envoyer le message"}
              </PrimaryButton>
            </div>
          </form>
        </>
      ) : (
        <div className="mt-5 rounded-[1.75rem] border border-white/10 bg-white/5 px-5 py-5 text-sm leading-7 text-text-muted">
          Ton reseau apparait a gauche. Clique sur un ami pour afficher le fil
          prive et commencer a discuter.
        </div>
      )}
    </CyberCard>
  );
}
