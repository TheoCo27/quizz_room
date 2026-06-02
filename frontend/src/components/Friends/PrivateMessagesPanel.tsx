import { useEffect, useRef, type FormEvent } from "react";
import type { SafeUser } from "../../services/auth";
import type { FriendUserSummary, PrivateMessage } from "../../services/users";
import { CyberBadge, CyberCard } from "../cyber";
import PrimaryButton from "../ui/PrimaryButton";
import Input from "../ui/input";

const PRIVATE_MESSAGE_MAX_LENGTH = 1000;

type PrivateMessagesPanelProps = {
  currentUser: SafeUser;
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
  currentUser,
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

  const chatListRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to the bottom of the chat list on new messages
  useEffect(() => {
    if (chatListRef.current) {
      chatListRef.current.scrollTop = chatListRef.current.scrollHeight;
    }
  }, [messages, isConversationLoading]);

  return (
    <CyberCard className="flex flex-col rounded-4xl p-6 h-[38rem]" accent="magenta">
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
      </div>

      {selectedFriend ? (
        <>
          <div
            ref={chatListRef}
            className="mt-5 flex-1 space-y-4 overflow-y-auto rounded-[1.75rem] border border-white/10 bg-white/5 p-4"
          >
            {isConversationLoading ? (
              <div className="rounded-[1.25rem] border border-white/10 bg-white/8 px-4 py-4 text-sm text-text-muted">
                Chargement de la conversation...
              </div>
            ) : null}

            {!isConversationLoading &&
              messages.length === 0 ? (
              <div className="rounded-[1.25rem] border border-white/10 bg-white/8 px-4 py-4 text-sm leading-7 text-text-muted">
                Aucun message pour l'instant. Lance la conversation avec{" "}
                {selectedFriend.username}.
              </div>
            ) : null}

            {messages.map((message) => {
              const isOwnMessage = message.senderId === currentUser.id;
              const senderUsername = isOwnMessage ? currentUser.username : selectedFriend.username;
              const senderAvatar = isOwnMessage ? currentUser.avatar_url : selectedFriend.avatar_url;

              return (
                <div key={message.id} className="flex items-start gap-3">
                  {senderAvatar ? (
                    <img
                      src={senderAvatar}
                      alt={senderUsername}
                      className="w-8 h-8 rounded-full object-cover border border-secondary/20"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center text-secondary font-bold text-xs">
                      {senderUsername.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-xs text-text-muted">
                      <span className="font-bold text-text">{senderUsername}</span>
                      <span>{formatTimestamp(message.createdAt)}</span>
                      {isOwnMessage && (
                        <span className="text-[10px] opacity-70">
                          ({message.readAt ? "Lu" : "Envoye"})
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-text break-words mt-0.5">{message.content}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <form
            className="mt-5"
            onSubmit={(event) => void onMessageSubmit(event)}
          >
            {conversationError ? (
              <div className="mb-3 rounded-[1.25rem] border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
                {conversationError}
              </div>
            ) : null}
            <label
              className="mb-2 block text-sm font-medium text-text-muted"
              htmlFor="private-message"
            >
              Ecrire a {selectedFriend.username}
            </label>
            <div className="flex items-center gap-2">
              <Input
                className="flex-1"
                id="private-message"
                placeholder="Ecris un message privé..."
                value={messageInput}
                onChange={(event) => onMessageInputChange(event.target.value)}
                maxLength={PRIVATE_MESSAGE_MAX_LENGTH}
                required
              />
              <PrimaryButton
                disabled={isSendingMessage || messageInput.length < 1}
                type="submit"
              >
                {isSendingMessage ? "Envoi..." : "Envoyer"}
              </PrimaryButton>
            </div>
            {hasReachedMessageLimit ? (
              <p className="mt-3 rounded-[1.25rem] border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
                Attention : le message a ete tronque. Maximum{" "}
                {PRIVATE_MESSAGE_MAX_LENGTH} caracteres.
              </p>
            ) : null}
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
