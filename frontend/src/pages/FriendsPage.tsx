import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { CyberCard, CyberPanel } from "../components/cyber";
import FriendNetworkPanel, {
  type FriendNotice,
} from "../components/Friends/FriendNetworkPanel";
import PrivateMessagesPanel from "../components/Friends/PrivateMessagesPanel";
import PrimaryButton from "../components/ui/PrimaryButton";
import SecondaryButton from "../components/ui/SecondaryButton";
import { useAuthSession } from "../hooks/useAuthSession";
import { getUserFacingErrorMessage } from "../services/api";
import { AUTH_USERNAME_MIN_LENGTH } from "../services/auth";
import {
  getConversationSummaries,
  getMyFriendOverview,
  getPrivateConversation,
  removeFriend,
  respondToFriendRequest,
  sendFriendRequest,
  sendPrivateMessage,
  type FriendOverview,
  type PrivateConversationSummary,
  type PrivateMessage,
} from "../services/users";
import {
  PRIVATE_MESSAGE_MAX_LENGTH,
  normalizeInput,
  validateSafeText,
  validateUsername,
} from "../utils/input-validation";

const FRIENDS_POLL_INTERVAL_MS = 2000;
const CONVERSATION_POLL_INTERVAL_MS = 500;


function areMessagesEqual(left: PrivateMessage[], right: PrivateMessage[]) {
  return (
    left.length === right.length &&
    left.every((message, index) => {
      const candidate = right[index];

      return (
        message.id === candidate?.id &&
        message.senderId === candidate.senderId &&
        message.receiverId === candidate.receiverId &&
        message.content === candidate.content &&
        message.createdAt === candidate.createdAt &&
        message.readAt === candidate.readAt
      );
    })
  );
}

export default function FriendsPage() {
  const { user, isLoading } = useAuthSession();
  const chatRateLimitRef = useRef({
    tokens: 10,
    lastRefill: Date.now(),
  });
  const [friendOverview, setFriendOverview] = useState<FriendOverview | null>(
    null,
  );
  const [conversationSummaries, setConversationSummaries] = useState<
    PrivateConversationSummary[]
  >([]);
  const [friendsError, setFriendsError] = useState<string | null>(null);
  const [isFriendsLoading, setIsFriendsLoading] = useState(false);
  const [friendUsername, setFriendUsername] = useState("");
  const [friendNotice, setFriendNotice] = useState<FriendNotice | null>(null);
  const [isSendingRequest, setIsSendingRequest] = useState(false);
  const [pendingActionId, setPendingActionId] = useState<number | null>(null);
  const [pendingRemovalFriendId, setPendingRemovalFriendId] = useState<
    number | null
  >(null);
  const [selectedFriendId, setSelectedFriendId] = useState<number | null>(null);
  const [messages, setMessages] = useState<PrivateMessage[]>([]);
  const [conversationLoadError, setConversationLoadError] = useState<string | null>(
    null,
  );
  const [conversationSendError, setConversationSendError] = useState<string | null>(
    null,
  );
  const conversationError = conversationLoadError || conversationSendError;
  const [isConversationLoading, setIsConversationLoading] = useState(false);
  const [messageInput, setMessageInput] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const isSendingMessageRef = useRef(false);
  const privateMessageTimestampsRef = useRef<number[]>([]);

  const conversationSummariesByFriendId = useMemo(
    () =>
      conversationSummaries.reduce<Record<number, PrivateConversationSummary>>(
        (accumulator, summary) => {
          accumulator[summary.friendId] = summary;
          return accumulator;
        },
        {},
      ),
    [conversationSummaries],
  );

  const selectedFriend =
    friendOverview?.friends.find((friend) => friend.id === selectedFriendId) ??
    null;

  const refreshFriendData = async (showLoading = false) => {
    if (showLoading) {
      setIsFriendsLoading(true);
    }

    const [overview, summaries] = await Promise.all([
      getMyFriendOverview(),
      getConversationSummaries(),
    ]);

    setFriendOverview(overview);
    setConversationSummaries(summaries);
    setFriendsError(null);

    if (showLoading) {
      setIsFriendsLoading(false);
    }
  };

  const refreshConversation = async (friendId: number) => {
    const conversation = await getPrivateConversation(friendId);
    setMessages(conversation);
    setConversationLoadError(null);
  };

  useEffect(() => {
    if (!user || user.isGuest) {
      setFriendOverview(null);
      setConversationSummaries([]);
      setFriendsError(null);
      setSelectedFriendId(null);
      return;
    }

    let cancelled = false;

    const loadData = async (showLoading = false) => {
      if (showLoading) {
        setIsFriendsLoading(true);
      }

      try {
        const [overview, summaries] = await Promise.all([
          getMyFriendOverview(),
          getConversationSummaries(),
        ]);

        if (cancelled) {
          return;
        }

        setFriendOverview(overview);
        setConversationSummaries(summaries);
        setFriendsError(null);
      } catch (error) {
        if (!cancelled) {
          setFriendsError(
            getUserFacingErrorMessage(
              error,
              "Impossible de charger le réseau de Chooms",
            ),
          );
        }
      } finally {
        if (!cancelled && showLoading) {
          setIsFriendsLoading(false);
        }
      }
    };

    void loadData(true);

    const interval = window.setInterval(() => {
      void loadData();
    }, FRIENDS_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [user]);

  useEffect(() => {
    if (!friendOverview || friendOverview.friends.length === 0) {
      setSelectedFriendId(null);
      return;
    }

    if (
      selectedFriendId !== null &&
      friendOverview.friends.some((friend) => friend.id === selectedFriendId)
    ) {
      return;
    }

    const prioritizedFriendId =
      conversationSummaries.find((summary) =>
        friendOverview.friends.some((friend) => friend.id === summary.friendId),
      )?.friendId ??
      friendOverview.friends[0]?.id ??
      null;

    setSelectedFriendId(prioritizedFriendId);
  }, [friendOverview, selectedFriendId, conversationSummaries]);

  useEffect(() => {
    if (!user || user.isGuest || selectedFriendId === null) {
      setMessages([]);
      setConversationLoadError(null);
      setConversationSendError(null);
      return;
    }

    let cancelled = false;

    const loadConversation = async (
      showLoading = false,
      syncFriendData = false,
    ) => {
      if (showLoading) {
        setIsConversationLoading(true);
      }

      try {
        const conversation = await getPrivateConversation(selectedFriendId);

        if (!cancelled) {
          setMessages((currentMessages) =>
            areMessagesEqual(currentMessages, conversation)
              ? currentMessages
              : conversation,
          );
          setConversationLoadError(null);

          if (syncFriendData) {
            void refreshFriendData().catch(() => {
              // The conversation remains usable even if the side summary refresh fails.
            });
          }
        }
      } catch (error) {
        if (!cancelled) {
          setConversationLoadError(
            getUserFacingErrorMessage(
              error,
              "Impossible de charger cette conversation",
            ),
          );
        }
      } finally {
        if (!cancelled && showLoading) {
          setIsConversationLoading(false);
        }
      }
    };

    void loadConversation(true, true);

    const interval = window.setInterval(() => {
      void loadConversation();
    }, CONVERSATION_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [selectedFriendId, user]);

  if (isLoading) {
    return (
      <main className="mx-auto flex w-full max-w-7xl flex-1 px-6 py-10 md:px-10">
        <CyberCard className="w-full p-8">
          <p className="cyber-eyebrow">Chooms</p>
          <h1 className="mt-4 cyber-title text-xl text-text">
            Chargement du réseau de Chooms...
          </h1>
        </CyberCard>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="mx-auto flex w-full max-w-5xl flex-1 px-6 py-10 md:px-10">
        <CyberPanel className="w-full rounded-[2.5rem] p-8">
          <p className="cyber-eyebrow">Chooms</p>
          <h1 className="mt-4 cyber-title text-3xl text-text">
            Cyberdeck déconnecté
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-text-muted">
            Synchronise ton Cyberdeck pour accéder à ton réseau de Chooms et ouvrir un flux Holocall sécurisé.
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

  const handleFriendSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFriendNotice(null);
    setIsSendingRequest(true);

    try {
      const normalizedUsername = normalizeInput(friendUsername);
      const usernameError = validateUsername(normalizedUsername);

      if (usernameError) {
        setFriendNotice({
          kind: "error",
          message: usernameError,
        });
        return;
      }

      const result = await sendFriendRequest(normalizedUsername);
      setFriendUsername("");
      setFriendNotice({
        kind: "success",
        message: result.message,
      });
      await refreshFriendData();
    } catch (error) {
      const message = getUserFacingErrorMessage(
        error,
        "Impossible de lier ce contact",
      );
      if (message) {
        setFriendNotice({
          kind: "error",
          message,
        });
      }
    } finally {
      setIsSendingRequest(false);
    }
  };

  const handleFriendRequestAction = async (
    requestId: number,
    action: "accepted" | "declined",
  ) => {
    setFriendNotice(null);
    setPendingActionId(requestId);

    try {
      const result = await respondToFriendRequest(requestId, action);
      setFriendNotice({
        kind: action === "accepted" ? "success" : "error",
        message: result.message,
      });
      await refreshFriendData();
    } catch (error) {
      const message = getUserFacingErrorMessage(
        error,
        "Impossible de mettre à jour la demande",
      );
      if (message) {
        setFriendNotice({
          kind: "error",
          message,
        });
      }
    } finally {
      setPendingActionId(null);
    }
  };

  const handleFriendRemoval = async (friendId: number) => {
    setFriendNotice(null);
    setPendingRemovalFriendId(friendId);

    try {
      const result = await removeFriend(friendId);
      setFriendNotice({
        kind: "success",
        message: result.message,
      });
      await refreshFriendData();
    } catch (error) {
      const message = getUserFacingErrorMessage(
        error,
        "Impossible de déconnecter ce contact",
      );
      if (message) {
        setFriendNotice({
          kind: "error",
          message,
        });
      }
    } finally {
      setPendingRemovalFriendId(null);
    }
  };

  const handleMessageSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (selectedFriendId === null) {
      return;
    }

    const normalizedMessage = normalizeInput(messageInput);
    const messageError = validateSafeText(normalizedMessage, {
      label: "Le message",
      minLength: 1,
      maxLength: PRIVATE_MESSAGE_MAX_LENGTH,
    });

    if (messageError) {
      setConversationSendError(messageError);
      setTimeout(() => {
        setConversationSendError((prev) => (prev === messageError ? null : prev));
      }, 4000);
      return;
    }

    if (isSendingMessageRef.current) {
      return;
    }

    const rateLimitMessage = checkChatLimit(chatRateLimitRef.current);

    if (rateLimitMessage) {
      setConversationSendError(rateLimitMessage);
      setTimeout(() => {
        setConversationSendError((prev) => (prev === rateLimitMessage ? null : prev));
      }, 4000);
      return;
    }

    isSendingMessageRef.current = true;
    setIsSendingMessage(true);

    try {
      await sendPrivateMessage(selectedFriendId, normalizedMessage);
      setMessageInput("");
      setConversationSendError(null);
      await Promise.all([
        refreshConversation(selectedFriendId),
        refreshFriendData(),
      ]);
    } catch (error) {
      const errMsg = getUserFacingErrorMessage(error, "Impossible d'envoyer le message");
      setConversationSendError(errMsg);
      setTimeout(() => {
        setConversationSendError((prev) => (prev === errMsg ? null : prev));
      }, 4000);
    } finally {
      isSendingMessageRef.current = false;
      setIsSendingMessage(false);
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 px-6 py-10 md:px-10">
      <section className="grid w-full gap-6 xl:grid-cols-[1.02fr_0.98fr]">
        <FriendNetworkPanel
          currentUser={user}
          friendOverview={friendOverview}
          friendsError={friendsError}
          isFriendsLoading={isFriendsLoading}
          friendUsername={friendUsername}
          onFriendUsernameChange={setFriendUsername}
          onFriendSubmit={handleFriendSubmit}
          friendNotice={friendNotice}
          isSendingRequest={isSendingRequest}
          pendingActionId={pendingActionId}
          onFriendRequestAction={handleFriendRequestAction}
          pendingRemovalFriendId={pendingRemovalFriendId}
          onFriendRemoval={handleFriendRemoval}
          selectedFriendId={selectedFriendId}
          onSelectFriend={setSelectedFriendId}
          conversationSummariesByFriendId={conversationSummariesByFriendId}
          usernameMinLength={AUTH_USERNAME_MIN_LENGTH}
        />

        <PrivateMessagesPanel
          currentUser={user}
          selectedFriend={selectedFriend}
          messages={messages}
          isConversationLoading={isConversationLoading}
          conversationError={conversationError}
          messageInput={messageInput}
          onMessageInputChange={setMessageInput}
          onMessageSubmit={handleMessageSubmit}
          isSendingMessage={isSendingMessage}
        />
      </section>
    </main>
  );
}

function checkChatLimit(bucket: { tokens: number; lastRefill: number }): string | null {
  const now = Date.now();
  const capacity = 10;
  const windowMs = 30000;
  const replenishRate = capacity / windowMs; // tokens per ms

  const elapsedMs = now - bucket.lastRefill;
  const addedTokens = elapsedMs * replenishRate;

  bucket.tokens = Math.min(capacity, bucket.tokens + addedTokens);
  bucket.lastRefill = now;

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    return null;
  } else {
    const neededTokens = 1 - bucket.tokens;
    const retryAfterMs = neededTokens / replenishRate;
    return `Vous devez attendre ${Math.ceil(retryAfterMs / 1000)} seconde(s) avant de renvoyer un message.`;
  }
}
