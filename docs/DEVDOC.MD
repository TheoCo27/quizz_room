# DEVDOC

## Objectif

Ce document remplace l'ancien `DEVDOC` et s'aligne sur le code reel present dans le depot au moment de l'ecriture.

## Concept du projet

Le projet est une application web de quiz multijoueur. Un utilisateur peut creer un compte classique, se connecter en invite ou via Google, rejoindre un espace social, gerer son profil, ajouter des amis, discuter, creer des quiz puis lancer des parties en room avec plusieurs joueurs.

Concretement, l'application sert a:

- centraliser l'authentification et la gestion des profils
- proposer une couche sociale avec amis, messages prives et chat de room
- permettre la creation et l'administration de quiz depuis le web
- orchestrer des parties de quiz en temps reel entre plusieurs joueurs
- conserver des statistiques comme les wins, l'XP et l'historique de match

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

## Technologies utilisees et pourquoi

- `React 18` pour construire une interface web dynamique en composants, avec un rendu reactif adapte a une SPA.
- `TypeScript` pour partager des types entre couches, limiter les erreurs et rendre le code plus maintenable.
- `NestJS` pour structurer le backend en modules, controllers et services avec injection de dependances.
- `PostgreSQL` pour stocker les donnees relationnelles du projet de maniere robuste.
- `Prisma` pour manipuler PostgreSQL avec un ORM type, des migrations et un schema centralise.
- `Socket.IO` pour synchroniser en temps reel les rooms, le chat et les parties de quiz.
- `JWT + cookies HTTP-only` pour garder une authentification persistante cote navigateur sans exposer le token au JavaScript client.
- `Google OAuth 2.0 / OIDC` pour proposer une connexion federée en plus du login local.
- `Docker Compose` pour lancer facilement toute la stack de dev avec des services isoles et reproductibles.
- `Webpack Dev Server` pour servir le frontend en developpement avec proxy HTTPS vers le backend.

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

## Validation et securite des formulaires

Le projet valide maintenant les saisies utilisateur sur les deux couches:

- cote frontend, avant l'envoi HTTP/WebSocket
- cote backend, au moment de l'entree dans les DTO REST et les payloads Socket.IO

### Champs couverts

Les controles concernent les formulaires et champs suivants:

- inscription classique: email, pseudo, mot de passe
- connexion classique et connexion invite
- mise a jour du profil: pseudo, statut, avatar
- ajout d'ami
- messages prives
- creation et edition de quiz: titre, questions, reponses
- creation de room et chat de room
- evenements WebSocket de room: `join_room`, `leave_room`, `close_room`, `toggle_ready`, `start_game`, `submit_answer`, `update_config`, `room_message`, `kick_player`

### Validation frontend

Le frontend bloque desormais les erreurs les plus courantes avant l'envoi:

- champs vides ou remplis uniquement avec des espaces
- longueurs minimales et maximales
- format d'email invalide
- pseudo invalide
  seuls les lettres, chiffres, points, tirets et underscores sont acceptes
- contenu HTML/script evident dans les zones texte affichees ensuite dans l'UI

Fichiers principaux:

- `frontend/src/utils/input-validation.ts`
- `frontend/src/pages/LoginPage.tsx`
- `frontend/src/pages/RegisterPage.tsx`
- `frontend/src/pages/ProfilePage.tsx`
- `frontend/src/pages/FriendsPage.tsx`
- `frontend/src/pages/LobbyPage.tsx`
- `frontend/src/pages/RoomPage.tsx`
- `frontend/src/pages/QuizAdminPage.tsx`
- `frontend/src/components/Friends/*`
- `frontend/src/components/QuizBuilder/*`

### Validation backend

Le backend applique une validation systematique via:

- `ValidationPipe` globale NestJS dans `backend/src/main.ts`
- DTO REST renforces dans `backend/src/modules/users/dto/*`, `backend/src/modules/quizzes/dto/*`, `backend/src/modules/rooms/dto/*`
- validation des evenements Socket.IO dans `backend/src/modules/rooms/rooms.gateway.ts`
- helpers communs dans `backend/src/common/validation/input-safety.ts`

Les regles backend couvrent:

- trim et normalisation des chaines
- rejection des champs vides apres trim
- verification des formats et bornes de longueur
- rejection des pseudo invalides
- rejection des contenus contenant des balises HTML, handlers inline (`on...=`) ou protocoles dangereux (`javascript:`, `data:text/html`, `vbscript:`)
- verification supplementaire des quiz
  unicite des reponses, bornes sur les titres/questions/reponses
- verification supplementaire des rooms
  nom optionnel mais valide, `maxPlayers` coherent avec le nombre de joueurs presents

### Champs vides et mauvais formats

La protection se fait a deux niveaux:

- le frontend affiche l'erreur tout de suite pour les cas simples
- le backend reste l'autorite finale et refuse toute charge utile invalide meme si le client est contourne

Concretement, une chaine comme `"   "` n'est plus acceptee pour un pseudo, un message, un titre de quiz, une question, une reponse ou un nom de room.

### Tentatives XSS

Deux protections se cumulent:

- les entrees utilisateur visibles dans l'interface sont filtrees en amont pour refuser les payloads HTML/script evidents
- l'interface React affiche ces valeurs comme du texte normal et non via `dangerouslySetInnerHTML`

Cela limite a la fois:

- l'injection persistante de balises `<script>`, `<img onerror=...>`, etc.
- les payloads utilisant `javascript:` ou des attributs inline de type `onclick=`

### Tentatives SQL injection

Le runtime applicatif passe par Prisma pour les acces base:

- `UsersService`
- `AuthService`
- `QuizzesService`
- `RoomsService`
- `PrivateMessagesService`
- `ScoresService`

Les donnees utilisateur ne sont donc pas concatenees dans des requetes SQL dynamiques exposees par l'application web. En pratique, cela reduit fortement le risque de SQL injection sur les flux applicatifs courants.

Note importante:

- des scripts de maintenance/tests dans `scripts/*.sh` utilisent bien du SQL brut, mais ils ne sont pas exposes aux formulaires ni aux routes runtime de l'application

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
  - `react`
    sert a construire l'interface en composants et a gerer les mises a jour d'etat.
  - `react-dom`
    sert a monter l'application React dans le DOM du navigateur.
  - `react-router-dom`
    sert a gerer la navigation SPA entre login, lobby, profil, room et jeu.
  - `socket.io-client`
    sert a ouvrir la connexion temps reel entre le navigateur et la gateway backend.
  - `fetch`
    sert a appeler les endpoints HTTP du backend depuis les services frontend.
- Backend:
  - `@nestjs/common`
    fournit les briques de base NestJS: decorators, exceptions, guards et providers.
  - `@nestjs/core`
    sert au bootstrap de l'application et au moteur d'injection de dependances.
  - `@nestjs/platform-express`
    branche NestJS sur le serveur HTTP Express utilise dans le projet.
  - `@nestjs/swagger`
    sert a generer la documentation Swagger/OpenAPI a partir des controllers et DTO.
  - `@nestjs/jwt`
    sert a signer et verifier les JWT utilises pour la session.
  - `@nestjs/throttler`
    sert a poser des mecanismes de limitation de debit cote backend.
  - `cookie-parser`
    sert a lire les cookies HTTP recus par Express/NestJS.
  - `express`
    est la couche HTTP sous-jacente sur laquelle NestJS s'appuie ici.
- Persistence:
  - `@prisma/client`
    fournit le client ORM type utilise par les services backend pour interroger PostgreSQL.
  - `@prisma/adapter-pg`
    sert a connecter Prisma au driver PostgreSQL retenu par le projet.
- Validation:
  - `class-validator`
    sert a declarer et executer les regles de validation sur les DTO entrants.
  - `class-transformer`
    sert a convertir les payloads bruts en instances de classes DTO.

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
  sert a declarer les pages, composants et hooks qui composent l'interface.
- `react-dom/client`
  sert a initialiser la racine React 18 avec `createRoot`.
- `react-router-dom`
  sert a piloter la navigation cote client sans rechargement complet de page.
- `socket.io-client`
  sert a relier les pages lobby/room/game aux evenements temps reel du backend.
- API navigateur:
  - `fetch`
    sert a faire les appels HTTP vers les routes REST.
  - `FileReader`
    sert a lire un fichier local pour l'avatar et le convertir en data URL.
  - `window.addEventListener`
    sert a reagir aux evenements globaux du navigateur.
  - `setInterval`
    sert aux rafraichissements periodiques ou aux pollings UI.
  - `setTimeout`
    sert a temporiser certaines transitions ou actions cote client.

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
  sert a definir controllers, services, guards, pipes et exceptions.
- `@nestjs/core`
  sert a demarrer l'application et a orchestrer le conteneur d'injection Nest.
- `@nestjs/platform-express`
  sert d'adaptateur entre NestJS et Express pour les routes HTTP.
- `@nestjs/swagger`
  sert a exposer une documentation interactive des routes backend.
- `@nestjs/jwt`
  sert a gerer la signature et la verification des tokens de session.
- `@nestjs/throttler`
  sert a introduire des limites de debit sur certaines actions sensibles.
- `class-validator`
  sert a verifier les contraintes des DTO avant d'entrer dans la logique metier.
- `class-transformer`
  sert a transformer les corps de requete en objets DTO exploitables.
- `cookie-parser`
  sert a parser les cookies pour les guards et la restauration de session.
- `express`
  sert de moteur HTTP concret sous l'application NestJS.

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
  sert a declarer la gateway et les handlers d'evenements temps reel cote backend.
- `socket.io`
  sert au transport temps reel, a la gestion des rooms et au broadcast serveur.
- `socket.io-client`
  sert a connecter le navigateur aux evenements de room, chat et partie.
- `JwtService.verifyAsync()`
  sert a authentifier chaque socket a partir du token de session.
- Prisma `findUnique`, `findMany`, `create`, `update`, `delete`
  servent a persister et relire rooms, joueurs et etats de partie dans PostgreSQL.
- `setTimeout`, `setInterval`
  servent a piloter la temporalite du quiz: countdown, duree des questions et enchainement.

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
  servent a manipuler amities, demandes, messages prives et profil utilisateur.
- `fetch`
  sert a consommer les endpoints REST des amis, conversations et profil.
- `socket.io-client`
  sert a recevoir et envoyer les messages de chat en room en temps reel.
- `FileReader`
  sert a charger un avatar local avant envoi vers le backend.
- `toLocaleDateString`, `toLocaleString`, `toLocaleTimeString`
  servent a afficher les dates et heures des messages dans un format lisible pour l'utilisateur.

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
  fournit le client ORM type, les enums et les types utilises dans le backend.
- `@prisma/adapter-pg`
  sert a faire communiquer Prisma avec PostgreSQL via l'adaptateur choisi.
- Prisma Client:
  - `findUnique`, `findMany`, `findFirst`
    servent a lire les enregistrements et relations depuis la base.
  - `create`, `update`, `updateMany`, `delete`, `deleteMany`
    servent a modifier les donnees applicatives.
  - `count`
    sert a calculer des totaux utiles pour stats et validations.
  - `upsert`
    sert a creer ou mettre a jour une ligne en une seule operation.
  - `$transaction`
    sert a garantir la coherence quand plusieurs ecritures doivent reussir ensemble.
  - `$queryRaw`
    sert pour quelques requetes SQL plus specifiques non couvertes directement par l'ORM.
  - `$connect`, `$disconnect`
    servent a gerer explicitement le cycle de vie de la connexion base.

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
  sert a produire une UI basee sur des APIs largement supportees par les navigateurs modernes.
- `react-router-dom`
  sert a naviguer cote client via l'History API standard.
- `socket.io-client`
  sert a abstraire les differences de transport temps reel entre navigateurs.
- APIs navigateur standard:
  - `fetch`
    sert aux appels HTTP sans dependre d'une librairie proprietaire.
  - `FileReader`
    sert a lire les fichiers locaux de maniere standardisee.
  - `History API`
    sert au routage SPA sans rechargement complet.
  - cookies
    servent a conserver la session de facon compatible entre navigateurs modernes.
  - `WebSocket` via Socket.IO
    sert a la communication temps reel avec fallback gere par Socket.IO si necessaire.
  - `toLocaleDateString`, `toLocaleTimeString`
    servent au formatage natif et compatible des dates/heures.
- Selecteurs/fallbacks CSS:
  - `::-webkit-scrollbar`
    sert a styliser les scrollbars sur les moteurs WebKit/Blink.
  - `::-webkit-progress-value`
    sert a styliser la valeur affichee dans les barres de progression WebKit/Blink.
  - `::-moz-progress-bar`
    sert a styliser les barres de progression cote Firefox.

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
  servent a stocker les mots de passe de facon hachee puis a verifier un login sans conserver le secret brut.
- `JwtService.signAsync()`, `JwtService.verifyAsync()`
  servent a creer et relire les tokens JWT de session.
- `Response.cookie()`, `Response.clearCookie()`
  servent a poser et supprimer le cookie HTTP-only d'authentification.
- `fetch`
  sert aux formulaires frontend d'inscription, connexion et recuperation de session.
- `FileReader`
  sert a preparer l'image d'avatar avant envoi au backend.

### Securite des mots de passe

- A l'inscription classique, `AuthService.register()` appelle `bcrypt.hash(dto.password, 10)`.
- Le `10` correspond au cost factor de bcrypt: l'algorithme reexecute plusieurs tours pour rendre un cassage par brute force plus couteux.
- Le salt est genere automatiquement par bcrypt pour chaque mot de passe au moment du hash. Il n'est donc pas gere manuellement dans le code.
- Avec bcrypt, le salt fait partie de la valeur hachee stockee en base. Le backend sauvegarde donc une chaine deja hachee qui embarque aussi les informations necessaires a la verification.
- A la connexion, `AuthService.validateUser()` n'essaie jamais de dechiffrer un mot de passe: il utilise `bcrypt.compare(dto.password, user.password)` pour comparer le mot de passe saisi avec le hash stocke.
- Le mot de passe brut n'est ni persiste en base ni renvoye au frontend. Le type `SafeUser` retire explicitement `password` et `googleId` avant tout retour API.
- Les comptes invites et les comptes crees via Google recoivent eux aussi un mot de passe aleatoire genere par `randomBytes(...)`, puis immediatement hache avec `bcrypt.hash(..., 10)` avant stockage.
- Les contraintes d'entree sont imposees des le DTO `RegisterDto`: mot de passe requis, longueur minimale de 12 caracteres et maximale de 40 caracteres.

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
  servent a calculer classements, rangs, wins, XP et historique depuis PostgreSQL.
- `Math.max`
  sert a borner certains calculs de score ou de progression.
- APIs de date et de rendu React
  servent a presenter les historiques, classements et niveaux dans l'interface.

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
  servent a demarrer le login Google, recuperer les tokens et charger la configuration OIDC/JWK.
- `createPublicKey()` et `verify()` de `crypto`
  servent a verifier localement la signature du `id_token` Google.
- `randomBytes()` de `crypto`
  sert a generer un `state` OAuth aleatoire pour se proteger du CSRF.
- `JwtService.signAsync()`, `JwtService.verifyAsync()`
  servent a convertir l'identite Google validee en session JWT interne au projet.
- `Response.redirect()`, cookies
  servent a renvoyer l'utilisateur vers Google puis a restaurer sa session applicative.

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
  servent a synchroniser en temps reel les joueurs, la room, les questions et les resultats.
- Prisma
  sert a persister quiz, rooms, joueurs et historique relies au jeu.
- React hooks
  servent a piloter l'etat local des pages lobby, room et partie.
- `fetch`
  sert a creer les rooms, charger les quiz et appeler les endpoints metier du jeu.
- `setTimeout`, `setInterval`
  servent a gerer countdowns, timers de question et rafraichissements de l'UI.

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
  sert a faire transiter les evenements temps reel entre plusieurs navigateurs distants.
- `socket.io-client`
  sert a reconnecter automatiquement le client et a ecouter l'etat serveur.
- `JwtService.verifyAsync()`
  sert a confirmer qu'un joueur distant est bien authentifie avant l'entree en room.
- cookies HTTP-only
  servent a partager la session entre HTTP et WebSocket sans exposer le token au frontend.
- WebSocket proxy `ws: true` dans Webpack Dev Server
  sert a relayer proprement la connexion temps reel du frontend de dev vers le backend.

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
  sert a conserver en base l'etat des rooms, participants et scores associes.
- `socket.io`
  sert a diffuser les mises a jour de jeu a tous les joueurs de la room.
- `socket.io-client`
  sert a recevoir ces mises a jour cote navigateur pour chaque participant.
- `Map<number, number>` et `Map<number, string>` dans la boucle de jeu
  servent a suivre efficacement les scores et reponses de plusieurs joueurs en memoire.

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
