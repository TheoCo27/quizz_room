# DEVDOC

## Objectif

Ce document remplace l'ancien `DEVDOC` et s'aligne sur le code reel present dans le depot au moment de l'ecriture.

Le projet implemente aujourd'hui:

- un frontend React 18 en TypeScript
- un backend NestJS en TypeScript
- une base PostgreSQL accessee via Prisma
- une authentification locale + invite + Google OAuth 2.0
- un systeme de profils, amis, messages prives et chat de room
- un jeu de quiz temps reel en room via WebSocket
- des statistiques de partie, de wins et d'XP

Important:

- plusieurs sections se recouvrent volontairement, car elles repondent a des modules differents du sujet
- ce document decrit le code reel, meme quand cela met en lumiere un point partiellement cable ou perfectible

## Vue rapide de l'architecture

```text
Browser
  -> https://localhost:3000
  -> frontend React + React Router + services fetch/socket.io-client
  -> proxy /auth /users /quizzes /scores /rooms /socket.io
  -> https://backend:4000
  -> backend NestJS
    -> modules auth / users / quizzes / scores / rooms
    -> gateway WebSocket /rooms
    -> PrismaService
  -> PostgreSQL
```

---

## 1. [Major] Use a framework for both frontend and backend

### Fichiers concernes

- `frontend/src/main.tsx`
- `frontend/src/App.tsx`
- `frontend/src/pages/*`
- `frontend/src/components/*`
- `frontend/src/hooks/useAuthSession.ts`
- `frontend/src/services/*`
- `frontend/webpack.config.cjs`
- `backend/src/main.ts`
- `backend/src/app.module.ts`
- `backend/src/app.controller.ts`
- `backend/src/app.service.ts`
- `backend/src/common/http/*`
- `backend/src/modules/auth/*`
- `backend/src/modules/users/*`
- `backend/src/modules/quizzes/*`
- `backend/src/modules/scores/*`
- `backend/src/modules/rooms/*`
- `backend/src/prisma/*`

### Types, DTO et classes utilises

- Frontend:
  `App`, `UseAuthSessionResult`, `SafeUser`, `Room`, `Quiz`, `FriendOverview`, `PrivateMessage`
- Backend:
  `AppModule`, `AuthModule`, `UsersModule`, `QuizzesModule`, `ScoresModule`, `RoomsModule`, `PrismaModule`
- DTO/transports:
  `LoginDto`, `RegisterDto`, `GuestLoginDto`, `CreateQuizDto`, `CreateQuizQuestionDto`, `UpdateProfileDto`, `UpdateAvatarDto`, `SendFriendRequestDto`, `SendPrivateMessageDto`
- Classes d'infrastructure:
  `AuthGuard`, `ApiExceptionFilter`, `PrismaService`

### Bibliotheques et fonctions externes utilisees

- Frontend:
  `react`, `react-dom`, `react-router-dom`, `socket.io-client`, `fetch`
- Backend:
  `@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express`, `@nestjs/swagger`, `@nestjs/jwt`, `@nestjs/throttler`, `cookie-parser`, `express`
- Persistence:
  `@prisma/client`, `@prisma/adapter-pg`
- Validation:
  `class-validator`, `class-transformer`

### Fonctions importantes

- `bootstrap()` dans `backend/src/main.ts`
  initialise NestJS, HTTPS, CORS, validation globale, cookies et Swagger
- `App()` dans `frontend/src/App.tsx`
  centralise le routage et les pages de l'application
- `apiRequest()` dans `frontend/src/services/api.ts`
  unifie tous les appels frontend vers le backend
- `useAuthSession()`
  centralise la session courante et son rafraichissement
- `AppModule`
  assemble tous les modules backend

### Etapes logiques d'integration

1. Creer le point d'entree frontend et backend.
2. Choisir un framework SPA cote client et un framework modulaire cote serveur.
3. Definir un routage frontend et des modules backend separes par domaine.
4. Centraliser les appels reseau et les erreurs.
5. Ajouter les briques transverses: validation, auth, persistence, WebSocket, docs.

---

## 2. [Minor] Use a frontend framework

### Fichiers concernes

- `frontend/src/main.tsx`
- `frontend/src/App.tsx`
- `frontend/src/pages/HomePage.tsx`
- `frontend/src/pages/LobbyPage.tsx`
- `frontend/src/pages/RoomPage.tsx`
- `frontend/src/pages/GamePage.tsx`
- `frontend/src/pages/FriendsPage.tsx`
- `frontend/src/pages/ProfilePage.tsx`
- `frontend/src/pages/LoginPage.tsx`
- `frontend/src/pages/RegisterPage.tsx`
- `frontend/src/pages/LeaderboardPage.tsx`
- `frontend/src/pages/QuizAdminPage.tsx`
- `frontend/src/components/*`
- `frontend/src/hooks/useAuthSession.ts`
- `frontend/src/services/*`
- `frontend/src/styles.css`
- `frontend/webpack.config.cjs`

### Types, DTO et classes utilises

- `SafeUser`
- `LoginPayload`, `RegisterPayload`, `GuestLoginPayload`
- `Room`, `RoomPlayer`, `SafeUserRoom`
- `Quiz`, `QuizQuestion`, `CreateQuizPayload`
- `FriendOverview`, `FriendUserSummary`, `FriendRequestSummary`
- `PrivateConversationSummary`, `PrivateMessage`
- `QuizLeaderboardEntry`, `WinsLeaderboardEntry`, `UserWinsRank`
- `UseAuthSessionResult`
- Types locaux de pages:
  `RoomChatMessage`, `QuestionPayload`, `QuestionResultPayload`, `DraftQuestion`, `ProfileTabId`

### Bibliotheques et fonctions externes utilisees

- `react`
- `react-dom/client`
- `react-router-dom`
- `socket.io-client`
- API navigateur:
  `fetch`, `FileReader`, `window.addEventListener`, `setInterval`, `setTimeout`

### Fonctions importantes

- `App()`
  declare toutes les routes de l'application
- `useAuthSession()`
  garde la session utilisateur synchronisee dans l'UI
- `performApiRequest()`
  encapsule `fetch`, les cookies et le format de reponse API
- `getSocket()`, `connectSocket()`, `disconnectSocket()`
  centralisent la connexion temps reel
- `handleCreateRoom()` dans `LobbyPage`
  cree une room puis redirige vers la room
- `handleSubmitQuiz()` dans `QuizAdminPage`
  valide puis cree ou modifie un quiz
- `handleMessageSubmit()` dans `FriendsPage`
  envoie un message prive avec limite locale de debit

### Etapes logiques d'integration

1. Monter React dans `main.tsx`.
2. Poser un routeur unique dans `App.tsx`.
3. Decouper l'application en pages, composants de presentation et services reseau.
4. Centraliser l'etat de session dans un hook.
5. Brancher les pages sur les endpoints REST et WebSocket.
6. Ajouter le style global et les composants UI reutilisables.

---

## 3. [Minor] Use a backend framework

### Fichiers concernes

- `backend/src/main.ts`
- `backend/src/app.module.ts`
- `backend/src/app.controller.ts`
- `backend/src/app.service.ts`
- `backend/src/common/http/api-response.ts`
- `backend/src/common/http/api-exception.filter.ts`
- `backend/src/common/http/error-response.util.ts`
- `backend/src/modules/auth/auth.module.ts`
- `backend/src/modules/auth/auth.controller.ts`
- `backend/src/modules/auth/auth.service.ts`
- `backend/src/modules/auth/guards/auth.guard.ts`
- `backend/src/modules/auth/decorators/current-user.decorator.ts`
- `backend/src/modules/users/users.module.ts`
- `backend/src/modules/users/users.controller.ts`
- `backend/src/modules/users/users.service.ts`
- `backend/src/modules/users/private-messages.service.ts`
- `backend/src/modules/users/private-message-rate-limit.service.ts`
- `backend/src/modules/quizzes/quizzes.module.ts`
- `backend/src/modules/quizzes/quizzes.controller.ts`
- `backend/src/modules/quizzes/quizzes.service.ts`
- `backend/src/modules/quizzes/quizzes-bootstrap.service.ts`
- `backend/src/modules/scores/scores.module.ts`
- `backend/src/modules/scores/scores.controller.ts`
- `backend/src/modules/scores/scores.service.ts`
- `backend/src/modules/rooms/rooms.module.ts`
- `backend/src/modules/rooms/rooms.controller.ts`
- `backend/src/modules/rooms/rooms.service.ts`
- `backend/src/modules/rooms/rooms.gateway.ts`
- `backend/src/modules/rooms/quiz-game.service.ts`
- `backend/src/prisma/prisma.module.ts`
- `backend/src/prisma/prisma.service.ts`

### Types, DTO et classes utilises

- Classes Nest:
  `AppModule`, `AuthModule`, `UsersModule`, `QuizzesModule`, `ScoresModule`, `RoomsModule`, `PrismaModule`
- Controllers:
  `AuthController`, `UsersController`, `QuizzesController`, `ScoresController`, `RoomsController`, `AppController`
- Services:
  `AuthService`, `UsersService`, `PrivateMessagesService`, `PrivateMessageRateLimitService`, `QuizzesService`, `QuizzesBootstrapService`, `ScoresService`, `RoomsService`, `QuizGameService`, `AppService`, `PrismaService`
- Guards/decorators/filters:
  `AuthGuard`, `CurrentUser`, `ApiExceptionFilter`
- DTO:
  `LoginDto`, `RegisterDto`, `GuestLoginDto`, `UpdateProfileDto`, `UpdateAvatarDto`, `SendFriendRequestDto`, `FriendRequestActionDto`, `SendPrivateMessageDto`, `CreateQuizDto`, `CreateQuizQuestionDto`
- Types:
  `AuthPayload`, `AuthenticatedRequest`, `SafeUser`, `ApiResponse<T>`

### Bibliotheques et fonctions externes utilisees

- `@nestjs/common`
- `@nestjs/core`
- `@nestjs/platform-express`
- `@nestjs/swagger`
- `@nestjs/jwt`
- `@nestjs/throttler`
- `class-validator`
- `class-transformer`
- `cookie-parser`
- `express`

### Fonctions importantes

- `bootstrap()`
  construit l'app Nest, active `ValidationPipe`, CORS et Swagger
- `AuthGuard.canActivate()`
  protege les routes via cookie JWT
- `CurrentUser`
  injecte l'utilisateur courant dans les controllers
- `ok()`
  normalise les reponses de succes
- `ApiExceptionFilter.catch()`
  normalise les erreurs backend

### Etapes logiques d'integration

1. Declarer un module racine.
2. Decouper le backend en modules fonctionnels.
3. Poser controllers, services et DTO par domaine.
4. Ajouter guard, decorateur de session et filtre d'erreurs.
5. Brancher Prisma et les autres services partages au systeme d'injection NestJS.

---

## 4. [Major] Implement real-time features

### Fichiers concernes

- `backend/src/modules/rooms/rooms.gateway.ts`
- `backend/src/modules/rooms/quiz-game.service.ts`
- `backend/src/modules/rooms/rooms.service.ts`
- `backend/src/modules/rooms/rooms.controller.ts`
- `backend/src/modules/rooms/rooms.module.ts`
- `backend/src/modules/auth/auth.service.ts`
- `backend/src/modules/users/private-message-rate-limit.service.ts`
- `backend/src/prisma/prisma.service.ts`
- `frontend/src/services/socket.ts`
- `frontend/src/services/rooms.ts`
- `frontend/src/pages/LobbyPage.tsx`
- `frontend/src/pages/RoomPage.tsx`
- `frontend/src/pages/GamePage.tsx`
- `frontend/webpack.config.cjs`

### Types, DTO et classes utilises

- Backend:
  `RoomsGateway`, `RoomsService`, `QuizGameService`, `RoomsController`, `RoomsModule`
- DTO/types backend:
  `CreateRoomDto`, `GameState`
- Frontend:
  `Room`, `RoomPlayer`, `SafeUserRoom`
- Types locaux frontend:
  `RoomChatMessage`, `QuestionPayload`, `QuestionResultPayload`

### Bibliotheques et fonctions externes utilisees

- `@nestjs/websockets`
- `socket.io`
- `socket.io-client`
- `JwtService.verifyAsync()`
- Prisma `findUnique`, `findMany`, `create`, `update`, `delete`
- `setTimeout`, `setInterval`

### Fonctions importantes

- `handleConnection()`
  authentifie la socket via JWT/cookie avant toute action
- `handleJoinRoom()`
  rattache le joueur a une room et pousse l'etat courant
- `handleStartGame()`
  declenche le countdown puis la boucle de jeu
- `handleSubmitAnswer()`
  transmet les reponses au moteur temps reel
- `handleRoomMessage()`
  broadcast le chat temps reel de la room
- `startGameLoop()`
  charge le quiz et initialise l'etat actif de partie
- `sendNextQuestion()`
  diffuse la question suivante a tous les joueurs
- `evaluateAnswersAndSendResult()`
  calcule les points, met a jour l'XP et pousse les resultats
- `getActiveGameQuestion()`
  permet la reprise d'une partie apres reconnexion/reload

### Etapes logiques d'integration

1. Creer une gateway WebSocket dediee aux rooms.
2. Authentifier chaque socket a partir de la session HTTP existante.
3. Stocker les rooms et joueurs dans PostgreSQL pour gerer reconnexion et persistance d'etat.
4. Ajouter les evenements metier: `join_room`, `leave_room`, `toggle_ready`, `start_game`, `submit_answer`, `room_message`.
5. Construire un moteur de jeu serveur qui pilote la sequence de questions.
6. Synchroniser le frontend avec les evenements `room_state_updated`, `question`, `question_result`, `game_ended`.
7. Ajouter un throttling de chat et une gestion propre des deconnexions.

---

## 5. [Major] Allow users to interact with other users

### Fichiers concernes

- `backend/src/modules/users/users.controller.ts`
- `backend/src/modules/users/users.service.ts`
- `backend/src/modules/users/private-messages.service.ts`
- `backend/src/modules/users/private-message-rate-limit.service.ts`
- `backend/src/modules/users/dto/send-friend-request.dto.ts`
- `backend/src/modules/users/dto/friend-request-action.dto.ts`
- `backend/src/modules/users/dto/send-private-message.dto.ts`
- `backend/src/modules/users/dto/update-profile.dto.ts`
- `backend/src/modules/users/dto/update-avatar.dto.ts`
- `backend/src/modules/auth/guards/auth.guard.ts`
- `backend/src/modules/rooms/rooms.gateway.ts`
- `frontend/src/pages/FriendsPage.tsx`
- `frontend/src/pages/ProfilePage.tsx`
- `frontend/src/pages/RoomPage.tsx`
- `frontend/src/components/Friends/FriendNetworkPanel.tsx`
- `frontend/src/components/Friends/PrivateMessagesPanel.tsx`
- `frontend/src/services/users.ts`
- `frontend/src/services/auth.ts`
- `frontend/src/services/socket.ts`

### Types, DTO et classes utilises

- DTO backend:
  `SendFriendRequestDto`, `FriendRequestActionDto`, `SendPrivateMessageDto`, `UpdateProfileDto`, `UpdateAvatarDto`
- Types backend:
  `FriendUserSummary`, `FriendRequestSummary`, `FriendOverview`, `FriendActionResult`, `FriendRemovalResult`, `PrivateConversationSummary`, `PrivateMessage`, `UpdateProfilePayload`
- Classes backend:
  `UsersController`, `UsersService`, `PrivateMessagesService`, `PrivateMessageRateLimitService`
- Types frontend:
  `FriendUserSummary`, `FriendRequestSummary`, `FriendOverview`, `FriendActionResult`, `FriendRemovalResult`, `PrivateConversationSummary`, `PrivateMessage`, `UpdateProfilePayload`
- Types UI:
  `FriendNotice`, `RoomChatMessage`

### Bibliotheques et fonctions externes utilisees

- Prisma `findMany`, `findFirst`, `create`, `update`, `updateMany`, `deleteMany`
- `fetch`
- `socket.io-client`
- `FileReader`
- `toLocaleDateString`, `toLocaleString`, `toLocaleTimeString`

### Fonctions importantes

- `getFriendOverview()`
  reconstruit la liste d'amis, demandes recues et demandes envoyees
- `sendFriendRequest()`
  cree une demande d'ami ou accepte une demande inverse deja existante
- `respondToFriendRequest()`
  accepte ou refuse une demande recue
- `removeFriend()`
  retire l'amitie et supprime l'historique prive associe
- `listConversationSummaries()`
  calcule les apercus, dates et compteurs de non lus
- `listConversation()`
  charge les messages et marque les messages recus comme lus
- `sendMessage()`
  persiste un message prive avec controle de debit
- `updateProfile()`
  met a jour le pseudo et le statut
- `updateAvatar()`
  met a jour ou supprime l'avatar en data URL
- `handleRoomMessage()`
  gere le chat temps reel de room

### Etapes logiques d'integration

1. Commencer par le profil public et la recuperation de l'utilisateur.
2. Ajouter le systeme de demandes d'amis avec une table dediee et un statut.
3. Exposer les endpoints d'envoi, d'acceptation, de refus et de suppression.
4. Construire la messagerie privee uniquement entre amis acceptes.
5. Ajouter la couche frontend de consultation, polling et envoi.
6. Ajouter un chat temps reel complementaire dans les rooms de jeu.
7. Proteger le tout avec auth et limites de debit.

---

## 6. [Minor] Use an ORM

### Fichiers concernes

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/*`
- `backend/prisma/seed_quiz.ts`
- `backend/prisma.config.ts`
- `backend/src/prisma/prisma.module.ts`
- `backend/src/prisma/prisma.service.ts`
- `backend/src/modules/auth/auth.service.ts`
- `backend/src/modules/users/users.service.ts`
- `backend/src/modules/users/private-messages.service.ts`
- `backend/src/modules/quizzes/quizzes.service.ts`
- `backend/src/modules/quizzes/quizzes-bootstrap.service.ts`
- `backend/src/modules/quizzes/default-quizzes.ts`
- `backend/src/modules/scores/scores.service.ts`
- `backend/src/modules/rooms/rooms.service.ts`
- `backend/src/modules/rooms/quiz-game.service.ts`

### Types, DTO et classes utilises

- `PrismaService`
- `PrismaClient`
- `PrismaPg`
- Types Prisma:
  `Prisma.UserCreateInput`, `Prisma.UserUpdateInput`, `Prisma.JsonValue`
- Enums Prisma:
  `UserStatus`, `FriendshipStatus`, `RoomStatus`, `GameType`
- Modeles Prisma:
  `User`, `FriendRequests`, `PrivateMessage`, `Quiz`, `QuizQuestion`, `QuizLeaderboard`, `Room`, `RoomPlayer`, `MatchHistory`, `MatchHistoryPlayer`

### Bibliotheques et fonctions externes utilisees

- `@prisma/client`
- `@prisma/adapter-pg`
- Prisma Client:
  `findUnique`, `findMany`, `findFirst`, `create`, `update`, `updateMany`, `delete`, `deleteMany`, `count`, `upsert`, `$transaction`, `$queryRaw`, `$connect`, `$disconnect`

### Fonctions importantes

- `PrismaService.client`
  expose un client Prisma unique dans toute l'application
- `PrismaService.onModuleInit()` / `onModuleDestroy()`
  gere le cycle de vie de la connexion DB
- `QuizzesService.createQuiz()`
  cree un quiz et ses questions en une seule operation
- `ScoresService.recordGameResult()`
  upsert les stats persistees par quiz
- `RoomsService.endGame()`
  cree une entree de `MatchHistory` et des `MatchHistoryPlayer`
- `PrivateMessagesService.sendMessage()`
  persiste les messages prives

### Etapes logiques d'integration

1. Modeliser les entites dans `schema.prisma`.
2. Generer le client Prisma.
3. Creer les migrations et seed si besoin.
4. Injecter `PrismaService` dans les services metier.
5. Ecrire la logique via les requetes Prisma plutot qu'en SQL ad hoc.
6. Ajouter des transactions et `upsert` quand plusieurs tables doivent rester coherentes.

---

## 7. [Minor] Support for additional browsers

### Fichiers concernes

- `frontend/src/main.tsx`
- `frontend/src/App.tsx`
- `frontend/src/styles.css`
- `frontend/src/services/api.ts`
- `frontend/src/services/socket.ts`
- `frontend/src/pages/LoginPage.tsx`
- `frontend/src/pages/FriendsPage.tsx`
- `frontend/src/pages/ProfilePage.tsx`
- `frontend/src/pages/RoomPage.tsx`
- `frontend/webpack.config.cjs`
- `Makefile`
- `scripts/open-url.sh`

### Types, DTO et classes utilises

- `SafeUser`
- `UseAuthSessionResult`
- `PrivateMessage`
- `Room`
- `QuestionPayload`
- `QuestionResultPayload`

### Bibliotheques et fonctions externes utilisees

- `react`
- `react-router-dom`
- `socket.io-client`
- APIs navigateur standard:
  `fetch`, `FileReader`, `History API`, cookies, `WebSocket` via Socket.IO, `toLocaleDateString`, `toLocaleTimeString`
- Selecteurs/fallbacks CSS:
  `::-webkit-scrollbar`, `::-webkit-progress-value`, `::-moz-progress-bar`

### Fonctions importantes

- `performApiRequest()`
  s'appuie sur `fetch` + cookies, APIs disponibles sur les navigateurs modernes
- `getSocket()`
  encapsule la connexion temps reel cote navigateur
- `readFileAsDataUrl()`
  gere l'import d'avatar via API standard `FileReader`
- `formatTimestamp()`, `formatChatTime()`, `formatJoinedDate()`
  exploitent les APIs standards d'internationalisation

### Etapes logiques d'integration

1. Utiliser des APIs web standards plutot que des APIs proprietaires.
2. Garder l'auth sur cookies HTTP-only, compatible avec les navigateurs modernes.
3. Servir le frontend et le backend en HTTPS pour eviter les blocages de cookies et de WebSocket securise.
4. Ajouter des fallback CSS vendorises quand necessaire.
5. Verifier manuellement le rendu et les flux en Chromium, Firefox et Safari.

### Note

Le depot montre une volonte de compatibilite multi-navigateurs via APIs standards et styles vendorises, mais il ne contient pas de suite automatisee dediee au cross-browser testing.

---

## 8. [Major] Standard user management

### Fichiers concernes

- `backend/src/modules/auth/auth.controller.ts`
- `backend/src/modules/auth/auth.service.ts`
- `backend/src/modules/auth/auth.module.ts`
- `backend/src/modules/auth/guards/auth.guard.ts`
- `backend/src/modules/auth/decorators/current-user.decorator.ts`
- `backend/src/modules/auth/types/*`
- `backend/src/modules/users/users.controller.ts`
- `backend/src/modules/users/users.service.ts`
- `backend/src/modules/users/dto/register.dto.ts`
- `backend/src/modules/users/dto/login.dto.ts`
- `backend/src/modules/users/dto/guest-login.dto.ts`
- `backend/src/modules/users/dto/update-profile.dto.ts`
- `backend/src/modules/users/dto/update-avatar.dto.ts`
- `frontend/src/services/auth.ts`
- `frontend/src/services/users.ts`
- `frontend/src/hooks/useAuthSession.ts`
- `frontend/src/pages/LoginPage.tsx`
- `frontend/src/pages/RegisterPage.tsx`
- `frontend/src/pages/ProfilePage.tsx`
- `frontend/src/components/Navbar.tsx`

### Types, DTO et classes utilises

- DTO:
  `LoginDto`, `RegisterDto`, `GuestLoginDto`, `UpdateProfileDto`, `UpdateAvatarDto`
- Types backend:
  `AuthPayload`, `AuthenticatedRequest`, `SafeUser`
- Types frontend:
  `SafeUser`, `LoginPayload`, `RegisterPayload`, `GuestLoginPayload`, `UpdateProfilePayload`
- Classes:
  `AuthController`, `AuthService`, `AuthGuard`, `UsersController`, `UsersService`

### Bibliotheques et fonctions externes utilisees

- `bcrypt.hash()`, `bcrypt.compare()`
- `JwtService.signAsync()`, `JwtService.verifyAsync()`
- `Response.cookie()`, `Response.clearCookie()`
- `fetch`
- `FileReader`

### Fonctions importantes

- `validateUser()`
  verifie le couple email/mot de passe
- `login()`
  cree le JWT, pose le cookie et renvoie le profil public
- `register()`
  cree un compte classique puis ouvre la session
- `loginAsGuest()`
  cree un compte invite temporaire
- `logout()`
  ferme la session et archive les comptes invites si besoin
- `getOptionalSessionUser()`
  restaure la session courante si le cookie est valide
- `updateProfile()`
  modifie pseudo et statut
- `updateAvatar()`
  controle et persiste l'avatar
- `handleLogout()` dans `Navbar`
  ferme la session cote UI

### Etapes logiques d'integration

1. Poser le modele `User` avec statut, avatar, guest et OAuth.
2. Ajouter inscription, login, logout et restauration de session.
3. Poser le guard JWT sur les routes protegees.
4. Ajouter la page profil et la mise a jour de l'avatar/statut.
5. Ajouter le mode invite avec archivage des identites temporaires.
6. Synchroniser le frontend via `useAuthSession()` et l'evenement `auth-changed`.

---

## 9. [Minor] Game statistics and match history

### Fichiers concernes

- `backend/prisma/schema.prisma`
- `backend/src/modules/scores/scores.controller.ts`
- `backend/src/modules/scores/scores.service.ts`
- `backend/src/modules/rooms/rooms.service.ts`
- `backend/src/modules/rooms/quiz-game.service.ts`
- `frontend/src/services/scores.ts`
- `frontend/src/pages/LeaderboardPage.tsx`
- `frontend/src/pages/ProfilePage.tsx`
- `frontend/src/utils/level.ts`

### Types, DTO et classes utilises

- Modeles Prisma:
  `QuizLeaderboard`, `MatchHistory`, `MatchHistoryPlayer`, `User`
- Types backend:
  `UserScore`, `QuizUserScore`, `ScoreSnapshot`
- Types frontend:
  `QuizLeaderboardEntry`, `WinsLeaderboardEntry`, `UserWinsRank`, `LevelData`
- Classes:
  `ScoresController`, `ScoresService`, `RoomsService`, `QuizGameService`

### Bibliotheques et fonctions externes utilisees

- Prisma `count`, `findMany`, `upsert`, `updateMany`, `$queryRaw`
- `Math.max`
- APIs de date et de rendu React

### Fonctions importantes

- `RoomsService.endGame()`
  cree l'historique de match et marque les gagnants
- `QuizGameService.evaluateAnswersAndSendResult()`
  calcule les points et credite l'XP question par question
- `ScoresService.recordGameResult()`
  maintient le leaderboard global en memoire et le leaderboard persistant par quiz
- `getWinsLeaderboard()`
  calcule le classement par victoires
- `getUserWinsRank()`
  calcule le rang d'un joueur sur l'historique de wins
- `calculateLevelData()`
  transforme l'XP totale en niveau et progression

### Etapes logiques d'integration

1. Ajouter des modeles de stats et d'historique au schema Prisma.
2. En fin de partie, enregistrer les participants, scores et gagnants.
3. Exposer des endpoints de lecture de leaderboard et de rang.
4. Brancher le frontend sur une page leaderboard et un resume sur le profil.
5. Ajouter une logique d'XP cumulative pour visualiser la progression.

### Note

Le code enregistre bien `MatchHistory`, `MatchHistoryPlayer`, les wins et l'XP.
La methode `ScoresService.recordGameResult()` prepare aussi un `QuizLeaderboard` persistant, mais elle n'est pas actuellement appelee dans le flux `RoomsService.endGame()`. Le socle existe, le cablage final peut encore etre renforce.

---

## 10. [Minor] Remote authentication

### Fichiers concernes

- `backend/src/modules/auth/auth.controller.ts`
- `backend/src/modules/auth/auth.service.ts`
- `backend/src/modules/auth/auth.module.ts`
- `backend/src/modules/auth/types/auth-payload.type.ts`
- `backend/src/modules/auth/types/safe-user.type.ts`
- `backend/src/modules/users/dto/login.dto.ts`
- `backend/src/modules/users/dto/register.dto.ts`
- `backend/src/modules/users/dto/guest-login.dto.ts`
- `frontend/src/pages/LoginPage.tsx`
- `frontend/src/services/auth.ts`
- `frontend/src/utils/err-msg.tsx`
- `.env`
- `.env.example`

### Types, DTO et classes utilises

- DTO:
  `LoginDto`, `RegisterDto`, `GuestLoginDto`
- Types backend:
  `GoogleConfig`, `GoogleIdTokenHeader`, `GoogleIdTokenPayload`, `VerifiedGoogleIdTokenPayload`, `GoogleTokenResponse`, `GoogleJwk`, `GoogleOidcConfiguration`, `GoogleStateCookiePayload`, `AuthPayload`, `SafeUser`
- Classes:
  `AuthController`, `AuthService`, `AuthModule`
- Types frontend:
  `SafeUser`, `LoginPayload`, `RegisterPayload`, `GuestLoginPayload`

### Bibliotheques et fonctions externes utilisees

- Google OIDC endpoints via `fetch`
- `createPublicKey()` et `verify()` de `crypto`
- `randomBytes()` de `crypto`
- `JwtService.signAsync()`, `JwtService.verifyAsync()`
- `Response.redirect()`, cookies

### Fonctions importantes

- `buildGoogleAuthorizationUrl()`
  construit l'URL de consentement Google et stocke l'etat anti-CSRF
- `handleGoogleCallback()`
  finalise le flux OAuth puis ouvre la session applicative
- `exchangeGoogleCodeForTokens()`
  echange le code OAuth contre un `id_token`
- `verifyGoogleIdToken()`
  verifie signature, issuer, audience et expiration
- `findOrCreateGoogleUser()`
  lie ou cree le compte local correspondant
- `normalizeGoogleAvatarUrl()`
  convertit l'avatar Google en data URL quand possible

### Etapes logiques d'integration

1. Ajouter les variables d'environnement Google.
2. Exposer une route `start` et une route `callback`.
3. Generer et stocker un `state` anti-CSRF.
4. Echanger le code OAuth contre un token.
5. Verifier cryptographiquement l'identite Google.
6. Mapper l'identite Google sur le modele `User`.
7. Ouvrir ensuite une session JWT standard pour le reste de l'application.

---

## 11. [Major] Web-based game

### Fichiers concernes

- `backend/src/modules/rooms/rooms.controller.ts`
- `backend/src/modules/rooms/rooms.service.ts`
- `backend/src/modules/rooms/rooms.gateway.ts`
- `backend/src/modules/rooms/quiz-game.service.ts`
- `backend/src/modules/rooms/rooms.module.ts`
- `backend/src/modules/quizzes/quizzes.controller.ts`
- `backend/src/modules/quizzes/quizzes.service.ts`
- `backend/src/modules/quizzes/quizzes-bootstrap.service.ts`
- `backend/src/modules/quizzes/dto/create-quiz.dto.ts`
- `backend/prisma/schema.prisma`
- `frontend/src/pages/LobbyPage.tsx`
- `frontend/src/pages/RoomPage.tsx`
- `frontend/src/pages/GamePage.tsx`
- `frontend/src/pages/QuizAdminPage.tsx`
- `frontend/src/pages/ProfilePage.tsx`
- `frontend/src/services/rooms.ts`
- `frontend/src/services/socket.ts`
- `frontend/src/services/quizzes.ts`
- `frontend/src/components/QuizBuilder/*`

### Types, DTO et classes utilises

- Modeles Prisma:
  `Room`, `RoomPlayer`, `Quiz`, `QuizQuestion`
- DTO:
  `CreateRoomDto`, `CreateQuizDto`, `CreateQuizQuestionDto`
- Classes:
  `RoomsController`, `RoomsService`, `RoomsGateway`, `QuizGameService`, `QuizzesController`, `QuizzesService`
- Types frontend:
  `Room`, `RoomPlayer`, `Quiz`, `QuizQuestion`, `CreateQuizPayload`
- Types locaux:
  `QuestionPayload`, `QuestionResultPayload`, `DraftQuestion`, `GameState`

### Bibliotheques et fonctions externes utilisees

- `socket.io`, `socket.io-client`
- Prisma
- React hooks
- `fetch`
- `setTimeout`, `setInterval`

### Fonctions importantes

- `createRoom()`
  initialise une partie jouable a partir d'un host et d'un quiz
- `startGame()`
  valide que la room est prete a jouer
- `startGameLoop()`
  transforme le quiz en partie temps reel
- `submitAnswer()`
  enregistre la reponse d'un joueur pour la question active
- `handleCreateRoom()` dans `LobbyPage`
  ouvre une nouvelle partie depuis le navigateur
- `handleStartGame()` dans `RoomPage`
  lance la partie depuis la room
- `handleSubmitAnswer()` dans `GamePage`
  envoie les reponses depuis l'UI de jeu
- `handleSubmitQuiz()` dans `QuizAdminPage`
  permet de creer le contenu jouable depuis le web

### Etapes logiques d'integration

1. Modeliser rooms, joueurs et quiz.
2. Permettre la creation de quiz depuis l'interface web.
3. Permettre la creation et la configuration d'une room depuis le navigateur.
4. Synchroniser les joueurs en WebSocket.
5. Lancer un moteur serveur qui pousse les questions et evalue les reponses.
6. Afficher le score et l'etat de la partie dans une page de jeu dediee.

---

## 12. [Major] Remote players

### Fichiers concernes

- `backend/src/modules/rooms/rooms.gateway.ts`
- `backend/src/modules/rooms/rooms.service.ts`
- `backend/src/modules/rooms/quiz-game.service.ts`
- `backend/src/modules/auth/auth.service.ts`
- `backend/src/modules/auth/guards/auth.guard.ts`
- `frontend/src/services/socket.ts`
- `frontend/src/pages/LobbyPage.tsx`
- `frontend/src/pages/RoomPage.tsx`
- `frontend/src/pages/GamePage.tsx`
- `frontend/webpack.config.cjs`

### Types, DTO et classes utilises

- `RoomsGateway`
- `RoomsService`
- `QuizGameService`
- `AuthPayload`
- `SafeUser`
- `Room`
- `RoomPlayer`
- `QuestionPayload`
- `QuestionResultPayload`

### Bibliotheques et fonctions externes utilisees

- `socket.io`
- `socket.io-client`
- `JwtService.verifyAsync()`
- cookies HTTP-only
- WebSocket proxy `ws: true` dans Webpack Dev Server

### Fonctions importantes

- `handleConnection()`
  verifie l'identite d'un joueur distant avant de l'autoriser a rejoindre
- `joinRoom()`
  rattache un utilisateur a une room persistante
- `handleDisconnect()`
  detecte les deconnexions reseau et met l'etat a jour
- `getActiveGameQuestion()`
  permet a un joueur rechargeant sa page de reprendre sur la question en cours
- `connectSocket()`
  reconnecte le client a la gateway

### Etapes logiques d'integration

1. Reutiliser la session auth HTTP pour authentifier la socket.
2. Faire porter tout l'etat de partie par le serveur, pas par un navigateur.
3. Persister la room et les joueurs pour supporter les reconnexions.
4. Diffuser les mises a jour de room et de jeu a tous les clients connectes.
5. Ajouter une logique de reprise si un joueur recharge ou change de page.

### Note

Le code supporte bien des joueurs sur des machines distinctes, car toute la synchronisation passe par le backend via HTTPS + WebSocket. Rien dans le flux ne suppose un partage local d'etat entre navigateurs.

---

## 13. [Major] Multiplayer (>2 players)

### Fichiers concernes

- `backend/prisma/schema.prisma`
- `backend/src/modules/rooms/rooms.controller.ts`
- `backend/src/modules/rooms/rooms.service.ts`
- `backend/src/modules/rooms/rooms.gateway.ts`
- `backend/src/modules/rooms/quiz-game.service.ts`
- `frontend/src/services/rooms.ts`
- `frontend/src/pages/LobbyPage.tsx`
- `frontend/src/pages/RoomPage.tsx`
- `frontend/src/pages/GamePage.tsx`

### Types, DTO et classes utilises

- Modeles Prisma:
  `Room`, `RoomPlayer`
- DTO:
  `CreateRoomDto`
- Types frontend:
  `Room`, `RoomPlayer`
- Types backend:
  `GameState`

### Bibliotheques et fonctions externes utilisees

- Prisma
- `socket.io`
- `socket.io-client`
- `Map<number, number>` et `Map<number, string>` dans la boucle de jeu

### Fonctions importantes

- `createRoom()`
  cree une room avec capacite configurable
- `joinRoom()`
  ajoute plusieurs joueurs dans la meme room
- `toggleReady()`
  gere l'etat individuel de chaque joueur
- `startGame()`
  valide que tous les joueurs sont prets
- `evaluateAnswersAndSendResult()`
  met a jour les scores de tous les participants
- affichage `room.players` dans `RoomPage` et `GamePage`
  rend visible un classement dynamique avec N joueurs

### Etapes logiques d'integration

1. Modeliser une relation `Room -> RoomPlayer[]`.
2. Ajouter une capacite max configurable cote backend.
3. Gerer l'etat `isReady`, `isConnected` et `score` par joueur.
4. Diffuser les questions et resultats a toute la room, pas juste a un duel.
5. Trier et afficher les scores en direct cote frontend.

### Note

Le modele supporte bien plus de 2 joueurs:

- `CreateRoomDto` autorise `maxPlayers` entre 2 et 10
- le frontend cree par defaut des rooms de 5 joueurs
- la logique de jeu et d'affichage travaille sur des tableaux/maps de joueurs, pas sur une structure 1v1

---

## Conclusion

Le depot couvre bien les briques principales attendues par le sujet:

- stack frontend/backend moderne avec React + NestJS
- persistence relationnelle via Prisma
- auth locale, invite et Google
- profils, amis, messages prives et chat de room
- gameplay quiz temps reel avec rooms multiplayer
- historique de match, wins et XP

Les deux points a garder en tete pour la maintenance sont:

- l'ancien `DEVDOC` n'etait plus coherent avec le code et ne doit plus servir de reference
- la persistance du `QuizLeaderboard` est preparee dans `ScoresService.recordGameResult()`, mais le flux de fin de partie actuel enregistre surtout `MatchHistory`, `wins` et `xp`
