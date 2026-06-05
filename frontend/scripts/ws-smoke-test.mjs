#!/usr/bin/env node

import fs from "node:fs";
import { io } from "socket.io-client";

const DEFAULT_EVENT_TIMEOUT_MS = Number(process.env.WS_SMOKE_TIMEOUT_MS || 12000);
const LONG_EVENT_TIMEOUT_MS = Number(process.env.WS_SMOKE_LONG_TIMEOUT_MS || 25000);
const PASSWORD = "longsecuredpassword123!";

function pass(message) {
  console.log(`[OK] ${message}`);
}

function fail(message) {
  throw new Error(message);
}

function assert(condition, message) {
  if (!condition) {
    fail(message);
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseArgs(argv) {
  const args = new Map();

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (!current.startsWith("--")) {
      continue;
    }

    const [rawKey, inlineValue] = current.split("=", 2);
    const key = rawKey.slice(2);
    const nextValue =
      inlineValue !== undefined ? inlineValue : argv[index + 1]?.startsWith("--") ? undefined : argv[index + 1];

    if (nextValue === undefined) {
      fail(`Argument manquant pour --${key}`);
    }

    args.set(key, nextValue);

    if (inlineValue === undefined) {
      index += 1;
    }
  }

  return args;
}

function extractAccessTokenCookie(response) {
  if (typeof response.headers.getSetCookie === "function") {
    const tokenCookie = response.headers
      .getSetCookie()
      .map((value) => value.split(";")[0])
      .find((value) => value.startsWith("access_token="));

    if (tokenCookie) {
      return tokenCookie;
    }
  }

  const singleHeader = response.headers.get("set-cookie");
  if (!singleHeader) {
    return null;
  }

  const tokenCookie = singleHeader
    .split(/,(?=\s*[A-Za-z0-9_\-]+=)/)
    .map((value) => value.trim().split(";")[0])
    .find((value) => value.startsWith("access_token="));

  return tokenCookie || null;
}

async function requestJson(baseUrl, path, options = {}) {
  const {
    method = "GET",
    body,
    cookieHeader,
  } = options;

  const headers = {
    Accept: "application/json",
  };

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (cookieHeader) {
    headers.Cookie = cookieHeader;
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await response.text();
  let json = null;
  try {
    json = text.length > 0 ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  return {
    status: response.status,
    headers: response.headers,
    text,
    json,
  };
}

function expectStatus(response, expectedStatuses, label) {
  if (!expectedStatuses.includes(response.status)) {
    fail(`${label}: statut inattendu ${response.status}, body: ${response.text}`);
  }
}

function expectApiSuccess(response, label) {
  assert(response.json?.success === true, `${label}: reponse API inattendue ${response.text}`);
  return response.json.data;
}

function buildIdentity(label, suffix) {
  const usernameSuffix = `${label}${suffix}`.slice(0, 16);

  return {
    email: `smoke-api-ws-${label}-${suffix}@test.com`,
    username: `ws_${usernameSuffix}`,
    password: PASSWORD,
  };
}

async function createAuthenticatedSession(baseUrl, label, suffix) {
  const identity = buildIdentity(label, suffix);
  const response = await requestJson(baseUrl, "/auth/register", {
    method: "POST",
    body: identity,
  });

  expectStatus(response, [201], `register ${label}`);
  const user = expectApiSuccess(response, `register ${label}`);
  const cookieHeader = extractAccessTokenCookie(response);

  assert(cookieHeader, `register ${label}: cookie access_token manquant`);
  assert(user?.email === identity.email, `register ${label}: email inattendu`);
  assert(user?.username === identity.username, `register ${label}: username inattendu`);
  assert(typeof user?.id === "number", `register ${label}: id user manquant`);

  pass(`WS auth ${label} OK`);

  return {
    ...identity,
    cookieHeader,
    userId: user.id,
  };
}

function createSocket(namespaceUrl, cookieHeader, ca) {
  return io(namespaceUrl, {
    autoConnect: false,
    reconnection: false,
    timeout: DEFAULT_EVENT_TIMEOUT_MS,
    transports: ["websocket", "polling"],
    extraHeaders: {
      Cookie: cookieHeader,
    },
    ...(ca
      ? {
          ca,
          rejectUnauthorized: true,
        }
      : {}),
  });
}

function waitForEvent(socket, eventName, predicate = () => true, timeoutMs = DEFAULT_EVENT_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const onEvent = (payload) => {
      if (!predicate(payload)) {
        return;
      }

      cleanup();
      resolve(payload);
    };

    const onError = (error) => {
      cleanup();
      reject(new Error(`Socket error pendant l'attente de "${eventName}": ${error?.message || error}`));
    };

    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`Timeout en attendant l'evenement "${eventName}"`));
    }, timeoutMs);

    const cleanup = () => {
      clearTimeout(timer);
      socket.off(eventName, onEvent);
      socket.off("connect_error", onError);
      socket.off("error", onError);
    };

    socket.on(eventName, onEvent);
    socket.on("connect_error", onError);
    socket.on("error", onError);
  });
}

async function connectAuthenticatedSocket(namespaceUrl, cookieHeader, ca, label) {
  const socket = createSocket(namespaceUrl, cookieHeader, ca);
  const connectPromise = new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`Timeout de connexion socket pour ${label}`));
    }, DEFAULT_EVENT_TIMEOUT_MS);

    const onConnect = () => {
      cleanup();
      resolve();
    };

    const onError = (error) => {
      cleanup();
      reject(new Error(`Connexion socket echouee pour ${label}: ${error?.message || error}`));
    };

    const cleanup = () => {
      clearTimeout(timer);
      socket.off("connect", onConnect);
      socket.off("connect_error", onError);
      socket.off("error", onError);
    };

    socket.on("connect", onConnect);
    socket.on("connect_error", onError);
    socket.on("error", onError);
  });

  socket.connect();
  await connectPromise;
  await delay(250);
  pass(`Socket ${label} connectee`);
  return socket;
}

function getPlayer(room, userId) {
  return room?.players?.find((player) => player?.userId === userId) ?? null;
}

function roomHasPlayers(room, userIds) {
  const presentIds = new Set((room?.players || []).map((player) => player.userId));
  return userIds.every((userId) => presentIds.has(userId));
}

function roomHasPlayerConnection(room, userId, isConnected) {
  return getPlayer(room, userId)?.isConnected === isConnected;
}

function roomHasPlayerReady(room, userId, isReady) {
  return getPlayer(room, userId)?.isReady === isReady;
}

async function createQuiz(baseUrl, cookieHeader, title, questionDurationSec, question) {
  const response = await requestJson(baseUrl, "/quizzes", {
    method: "POST",
    cookieHeader,
    body: {
      title,
      questionDurationSec,
      questions: [question],
    },
  });

  expectStatus(response, [201], `creation quiz ${title}`);
  const quiz = expectApiSuccess(response, `creation quiz ${title}`);
  assert(typeof quiz?.id === "number", `creation quiz ${title}: id manquant`);
  return quiz;
}

async function createRoom(baseUrl, cookieHeader, payload, label) {
  const response = await requestJson(baseUrl, "/rooms", {
    method: "POST",
    cookieHeader,
    body: payload,
  });

  expectStatus(response, [201], `creation room ${label}`);
  const room = expectApiSuccess(response, `creation room ${label}`);
  assert(typeof room?.id === "string", `creation room ${label}: id room manquant`);
  return room;
}

async function emitAndExpect(socket, eventName, payload, eventToWait, predicate, timeoutMs = DEFAULT_EVENT_TIMEOUT_MS) {
  const eventPromise = waitForEvent(socket, eventToWait, predicate, timeoutMs);
  socket.emit(eventName, payload);
  return eventPromise;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const baseUrl = args.get("base-url");
  const caFile = args.get("ca-file");

  if (!baseUrl) {
    fail("Utilisation: ws-smoke-test.mjs --base-url https://localhost:3000 --ca-file /path/to/ca.pem");
  }

  const ca = caFile ? fs.readFileSync(caFile) : undefined;
  const namespaceUrl = `${baseUrl}/rooms`;
  const runSuffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const resources = {
    waitingRoomId: null,
    closeRoomId: null,
    gameRoomId: null,
  };

  const sockets = [];

  let hostSession;
  let peerSession;
  let observerSession;

  try {
    hostSession = await createAuthenticatedSession(baseUrl, "host", runSuffix);
    peerSession = await createAuthenticatedSession(baseUrl, "peer", runSuffix);
    observerSession = await createAuthenticatedSession(baseUrl, "obs", runSuffix);

    const smokeQuiz = await createQuiz(
      baseUrl,
      hostSession.cookieHeader,
      `Smoke API Quiz WS ${runSuffix}`,
      0,
      {
        questionText: "Quelle couleur est la bonne pour le smoke test WS ?",
        answers: ["Bleu", "Rouge"],
        correctAnswerIndex: 0,
        points: 120,
      },
    );

    const waitingRoom = await createRoom(
      baseUrl,
      hostSession.cookieHeader,
      {
        gameType: "QUIZ",
        maxPlayers: 4,
        name: `Smoke API Room WS Waiting ${runSuffix}`,
      },
      "waiting",
    );
    resources.waitingRoomId = waitingRoom.id;

    const closeRoom = await createRoom(
      baseUrl,
      hostSession.cookieHeader,
      {
        gameType: "QUIZ",
        maxPlayers: 3,
        name: `Smoke API Room WS Close ${runSuffix}`,
      },
      "close",
    );
    resources.closeRoomId = closeRoom.id;

    const gameRoom = await createRoom(
      baseUrl,
      hostSession.cookieHeader,
      {
        gameType: "QUIZ",
        maxPlayers: 2,
        name: `Smoke API Room WS Game ${runSuffix}`,
        quizId: smokeQuiz.id,
      },
      "game",
    );
    resources.gameRoomId = gameRoom.id;

    const hostSocket = await connectAuthenticatedSocket(
      namespaceUrl,
      hostSession.cookieHeader,
      ca,
      "host",
    );
    const peerSocket = await connectAuthenticatedSocket(
      namespaceUrl,
      peerSession.cookieHeader,
      ca,
      "peer",
    );
    let observerSocket = await connectAuthenticatedSocket(
      namespaceUrl,
      observerSession.cookieHeader,
      ca,
      "observer",
    );
    sockets.push(hostSocket, peerSocket, observerSocket);

    const pongPayload = await emitAndExpect(
      hostSocket,
      "ping",
      { smoke: "ws" },
      "pong",
      (payload) => payload?.smoke === "ws",
    );
    assert(pongPayload.smoke === "ws", "Ping/Pong WS invalide");
    pass("WebSocket ping/pong OK");

    const waitingHostJoinPromise = waitForEvent(
      hostSocket,
      "room_state_updated",
      (room) =>
        room?.id === waitingRoom.id &&
        roomHasPlayers(room, [hostSession.userId]) &&
        roomHasPlayerConnection(room, hostSession.userId, true),
    );
    hostSocket.emit("join_room", { roomId: waitingRoom.id });
    await waitingHostJoinPromise;
    pass("join_room hote OK");

    const peerJoinState = waitForEvent(
      hostSocket,
      "room_state_updated",
      (room) =>
        room?.id === waitingRoom.id &&
        roomHasPlayers(room, [hostSession.userId, peerSession.userId]),
    );
    peerSocket.emit("join_room", { roomId: waitingRoom.id });
    await peerJoinState;
    pass("join_room pair OK");

    const observerJoinState = waitForEvent(
      hostSocket,
      "room_state_updated",
      (room) =>
        room?.id === waitingRoom.id &&
        roomHasPlayers(room, [hostSession.userId, peerSession.userId, observerSession.userId]),
    );
    observerSocket.emit("join_room", { roomId: waitingRoom.id });
    await observerJoinState;
    pass("join_room observateur OK");

    const toggleReadyState = waitForEvent(
      hostSocket,
      "room_state_updated",
      (room) =>
        room?.id === waitingRoom.id &&
        roomHasPlayerReady(room, peerSession.userId, true),
    );
    peerSocket.emit("toggle_ready", { roomId: waitingRoom.id });
    await toggleReadyState;
    pass("toggle_ready OK");

    const updateConfigState = waitForEvent(
      hostSocket,
      "room_state_updated",
      (room) =>
        room?.id === waitingRoom.id &&
        room?.quizId === smokeQuiz.id &&
        room?.maxPlayers === 5,
    );
    hostSocket.emit("update_config", {
      roomId: waitingRoom.id,
      config: {
        quizId: smokeQuiz.id,
        maxPlayers: 5,
      },
    });
    await updateConfigState;
    pass("update_config OK");

    const roomMessage = waitForEvent(
      peerSocket,
      "room_message",
      (payload) =>
        payload?.userId === hostSession.userId &&
        payload?.content === "Salut room smoke WS",
    );
    hostSocket.emit("room_message", {
      roomId: waitingRoom.id,
      content: "Salut room smoke WS",
    });
    await roomMessage;
    pass("room_message OK");

    const disconnectedNotice = waitForEvent(
      hostSocket,
      "player_disconnected",
      (payload) => payload?.userId === observerSession.userId,
    );
    const disconnectedState = waitForEvent(
      hostSocket,
      "room_state_updated",
      (room) =>
        room?.id === waitingRoom.id &&
        roomHasPlayerConnection(room, observerSession.userId, false),
    );
    observerSocket.disconnect();
    await Promise.all([disconnectedNotice, disconnectedState]);
    pass("handleDisconnect WAITING OK");

    observerSocket = await connectAuthenticatedSocket(
      namespaceUrl,
      observerSession.cookieHeader,
      ca,
      "observer-reconnect",
    );
    sockets.push(observerSocket);
    const observerReconnectState = waitForEvent(
      observerSocket,
      "room_state_updated",
      (room) =>
        room?.id === waitingRoom.id &&
        roomHasPlayers(room, [hostSession.userId, peerSession.userId, observerSession.userId]) &&
        roomHasPlayerConnection(room, observerSession.userId, true),
    );
    observerSocket.emit("join_room", { roomId: waitingRoom.id });
    await observerReconnectState;
    pass("Reconnexion + join_room OK");

    const leaveState = waitForEvent(
      hostSocket,
      "room_state_updated",
      (room) =>
        room?.id === waitingRoom.id &&
        !roomHasPlayers(room, [observerSession.userId]),
    );
    observerSocket.emit("leave_room", { roomId: waitingRoom.id });
    await leaveState;
    pass("leave_room OK");

    const kickedNotice = waitForEvent(peerSocket, "kicked_from_room", () => true);
    const kickedState = waitForEvent(
      hostSocket,
      "room_state_updated",
      (room) =>
        room?.id === waitingRoom.id &&
        !roomHasPlayers(room, [peerSession.userId]) &&
        roomHasPlayers(room, [hostSession.userId]),
    );
    hostSocket.emit("kick_player", {
      roomId: waitingRoom.id,
      targetUserId: peerSession.userId,
    });
    await Promise.all([kickedNotice, kickedState]);
    pass("kick_player OK");

    const closeHostJoin = waitForEvent(
      hostSocket,
      "room_state_updated",
      (room) => room?.id === closeRoom.id && roomHasPlayers(room, [hostSession.userId]),
    );
    hostSocket.emit("join_room", { roomId: closeRoom.id });
    await closeHostJoin;

    const closePeerJoin = waitForEvent(
      hostSocket,
      "room_state_updated",
      (room) =>
        room?.id === closeRoom.id &&
        roomHasPlayers(room, [hostSession.userId, peerSession.userId]),
    );
    peerSocket.emit("join_room", { roomId: closeRoom.id });
    await closePeerJoin;

    const closeNotifications = Promise.all([
      waitForEvent(hostSocket, "room_closed", () => true),
      waitForEvent(peerSocket, "room_closed", () => true),
    ]);
    hostSocket.emit("close_room", { roomId: closeRoom.id });
    await closeNotifications;
    pass("close_room OK");
    resources.closeRoomId = null;

    const gameHostJoin = waitForEvent(
      hostSocket,
      "room_state_updated",
      (room) => room?.id === gameRoom.id && roomHasPlayers(room, [hostSession.userId]),
    );
    hostSocket.emit("join_room", { roomId: gameRoom.id });
    await gameHostJoin;

    const gamePeerJoin = waitForEvent(
      hostSocket,
      "room_state_updated",
      (room) =>
        room?.id === gameRoom.id &&
        roomHasPlayers(room, [hostSession.userId, peerSession.userId]),
    );
    peerSocket.emit("join_room", { roomId: gameRoom.id });
    await gamePeerJoin;

    const gamePeerReady = waitForEvent(
      hostSocket,
      "room_state_updated",
      (room) =>
        room?.id === gameRoom.id &&
        roomHasPlayerReady(room, peerSession.userId, true),
    );
    peerSocket.emit("toggle_ready", { roomId: gameRoom.id });
    await gamePeerReady;

    const gameStarting = Promise.all([
      waitForEvent(hostSocket, "game_starting", (payload) => payload?.countdown === 5, LONG_EVENT_TIMEOUT_MS),
      waitForEvent(peerSocket, "game_starting", (payload) => payload?.countdown === 5, LONG_EVENT_TIMEOUT_MS),
    ]);
    const playingState = waitForEvent(
      hostSocket,
      "room_state_updated",
      (room) => room?.id === gameRoom.id && room?.status === "PLAYING",
      LONG_EVENT_TIMEOUT_MS,
    );
    const hostQuestion = waitForEvent(
      hostSocket,
      "question",
      (payload) => payload?.position === 1 && payload?.totalQuestions === 1,
      LONG_EVENT_TIMEOUT_MS,
    );
    const peerQuestion = waitForEvent(
      peerSocket,
      "question",
      (payload) => payload?.position === 1 && payload?.totalQuestions === 1,
      LONG_EVENT_TIMEOUT_MS,
    );
    hostSocket.emit("start_game", { roomId: gameRoom.id });
    await gameStarting;
    await playingState;
    const [hostQuestionPayload] = await Promise.all([hostQuestion, peerQuestion]);
    pass("start_game + question OK");

    const questionResultHost = waitForEvent(
      hostSocket,
      "question_result",
      (payload) =>
        payload?.correctAnswer === "Bleu" &&
        Array.isArray(payload?.results) &&
        payload.results.some((result) => result.userId === hostSession.userId),
      LONG_EVENT_TIMEOUT_MS,
    );
    const questionResultPeer = waitForEvent(
      peerSocket,
      "question_result",
      (payload) =>
        payload?.correctAnswer === "Bleu" &&
        Array.isArray(payload?.results) &&
        payload.results.some((result) => result.userId === peerSession.userId),
      LONG_EVENT_TIMEOUT_MS,
    );
    hostSocket.emit("submit_answer", {
      roomId: gameRoom.id,
      answer: hostQuestionPayload.answers[0],
    });
    peerSocket.emit("submit_answer", {
      roomId: gameRoom.id,
      answer: hostQuestionPayload.answers[1],
    });
    const resultPayload = await questionResultHost;
    await questionResultPeer;
    assert(
      resultPayload.results.some(
        (result) => result.userId === hostSession.userId && result.correct === true,
      ),
      "submit_answer: le score attendu du host est absent",
    );
    pass("submit_answer + question_result OK");

    const finishedState = waitForEvent(
      hostSocket,
      "room_state_updated",
      (room) => room?.id === gameRoom.id && room?.status === "FINISHED",
      LONG_EVENT_TIMEOUT_MS,
    );
    const gameEnded = Promise.all([
      waitForEvent(hostSocket, "game_ended", (room) => room?.id === gameRoom.id, LONG_EVENT_TIMEOUT_MS),
      waitForEvent(peerSocket, "game_ended", (room) => room?.id === gameRoom.id, LONG_EVENT_TIMEOUT_MS),
    ]);
    await finishedState;
    await gameEnded;
    pass("game_ended OK");

    pass("Smoke test WebSocket termine avec succes");
  } finally {
    const hostSocket = sockets.find((socket) => socket.connected && socket.io.opts.extraHeaders?.Cookie === hostSession?.cookieHeader);

    if (hostSocket) {
      for (const roomId of [
        resources.waitingRoomId,
        resources.closeRoomId,
        resources.gameRoomId,
      ]) {
        if (!roomId) {
          continue;
        }

        try {
          hostSocket.emit("close_room", { roomId });
          await delay(200);
        } catch {
          // Ignore best-effort cleanup failures, the bash trap handles DB cleanup.
        }
      }
    }

    for (const socket of sockets) {
      if (socket && socket.connected) {
        socket.disconnect();
      }
    }
  }
}

main().catch((error) => {
  console.error(`[KO] ${error.message}`);
  process.exit(1);
});
