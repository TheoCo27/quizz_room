import { useEffect, useRef, type FormEvent } from "react";
import type { SafeUser } from "../../services/auth";
import type { FriendUserSummary, PrivateMessage } from "../../services/users";
import { CyberBadge, CyberCard } from "../cyber";
import PrimaryButton from "../ui/PrimaryButton";
import Input from "../ui/input";
import {
  PRIVATE_MESSAGE_MAX_LENGTH,
  normalizeInput,
} from "../../utils/input-validation";

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
        <p className="cyber-eyebrow">Holocalls cryptés (Chat)</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h2 className="cyber-title text-2xl text-text">
            {selectedFriend ? selectedFriend.username : "Sélectionne un Choom"}
          </h2>
          {selectedFriend ? (
            <CyberBadge variant="info">Canal sécurisé</CyberBadge>
          ) : null}
        </div>
      </div>

      {selectedFriend ? (
        <>
          <div
            ref={chatListRef}
            className="mt-5 flex-1 space-y-4 overflow-y-auto rounded-[1.75rem] border border-white/10 bg-black/40 p-4 flex flex-col"
          >
            {isConversationLoading ? (
              <div className="rounded-[1.25rem] border border-white/10 bg-white/8 px-4 py-4 text-sm text-text-muted">
                Décryptage du flux de communication...
              </div>
            ) : null}

            {!isConversationLoading &&
              messages.length === 0 ? (
              <div className="rounded-[1.25rem] border border-white/10 bg-white/8 px-4 py-4 text-sm leading-7 text-text-muted">
                Aucune transmission enregistrée. Initialise le flux avec{" "}
                {selectedFriend.username}.
              </div>
            ) : null}

            {messages.map((message) => {
              const isOwnMessage = message.senderId === currentUser.id;
              const senderUsername = isOwnMessage ? currentUser.username : selectedFriend.username;
              const senderAvatar = isOwnMessage ? currentUser.avatar_url : selectedFriend.avatar_url;

              return (
                <div
                  key={message.id}
                  className={`flex items-start gap-3 max-w-[85%] ${
                    isOwnMessage ? "self-end flex-row-reverse" : "self-start"
                  }`}
                >
                  {senderAvatar ? (
                    <img
                      src={senderAvatar}
                      alt={senderUsername}
                      className="w-8 h-8 rounded-full object-cover border border-secondary/20 shrink-0"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center text-secondary font-bold text-xs shrink-0">
                      {senderUsername.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className={`flex flex-col ${isOwnMessage ? "items-end" : "items-start"}`}>
                    <div className="flex items-center gap-2 text-[10px] text-text-muted mb-1">
                      <span className="font-bold text-text">{senderUsername}</span>
                      <span>{formatTimestamp(message.createdAt)}</span>
                      {isOwnMessage && (
                        <span className="opacity-70">
                          ({message.readAt ? "Décrypté" : "Transmis"})
                        </span>
                      )}
                    </div>
                    <div
                      className={`text-sm break-words px-4 py-2.5 rounded-2xl border ${
                        isOwnMessage
                          ? "bg-secondary/12 border-secondary/35 text-text rounded-tr-none"
                          : "bg-white/6 border-white/10 text-text rounded-tl-none"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{message.content}</p>
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
            {conversationError ? (
              <div className="mb-3 rounded-[1.25rem] border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
                {conversationError}
              </div>
            ) : null}
            <label
              className="mb-2 block text-sm font-medium text-text-muted"
              htmlFor="private-message"
            >
              Transmission vers {selectedFriend.username}
            </label>
            <div className="flex items-center gap-2">
              <Input
                className="flex-1"
                id="private-message"
                placeholder="Saisis ta transmission..."
                value={messageInput}
                onChange={(event) => onMessageInputChange(event.target.value)}
                maxLength={PRIVATE_MESSAGE_MAX_LENGTH}
                required
              />
              <PrimaryButton
                disabled={
                  isSendingMessage || normalizeInput(messageInput).length < 1
                }
                type="submit"
              >
                {isSendingMessage ? "Transmission..." : "Transmettre"}
              </PrimaryButton>
            </div>
            {hasReachedMessageLimit ? (
              <p className="mt-3 rounded-[1.25rem] border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
                Attention : la transmission a été tronquée. Maximum{" "}
                {PRIVATE_MESSAGE_MAX_LENGTH} caractères.
              </p>
            ) : null}
          </form>
        </>
      ) : (
        <div className="mt-5 rounded-[1.75rem] border border-white/10 bg-white/5 px-5 py-5 text-sm leading-7 text-text-muted">
          Ton réseau de contacts apparaît à gauche. Connecte-toi à un Choom pour
          décrypter son flux Holocall privé.
        </div>
      )}
    </CyberCard>
  );
}
