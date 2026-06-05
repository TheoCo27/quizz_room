# Guide Dev

## Objectif

Ce document donne une reference rapide pour lancer, tester et comprendre l'etat actuel du projet `ft_transcendance`.

## Stack actuelle

### Infrastructure

- Docker Compose pour orchestrer les services
- 3 services principaux:
  - `frontend`
  - `backend`
  - `db`
- `prisma-studio` uniquement via `make dev`
- healthchecks sur `frontend`, `backend` et `db`

### Frontend

- React
- TypeScript
- Webpack Dev Server
- port par defaut: `3000`

Role actuel:

- servir l'application web en HTTPS local
- appeler le backend via le proxy de dev
- exposer les pages accueil, login, register, profil, amis, admin quiz

Routes proxifiees vers le backend:

- `/api`
- `/health`
- `/auth`
- `/users`
- `/scores`
- `/quizzes`
- `/rooms`
- `/socket.io`

### Backend

- NestJS
- TypeScript
- Prisma ORM
- port par defaut: `4000`

Role actuel:

- exposer les endpoints REST
- gerer auth, users, quizzes, scores et rooms
- exposer le temps reel Socket.IO pour les rooms et parties de quiz
- verifier la disponibilite PostgreSQL via `/health`

### Base de donnees

- PostgreSQL 16
- volume Docker `postgres_volume`

## Architecture de dev

```text
Navigateur
  -> https://localhost:3000
  -> frontend React + Webpack Dev Server
  -> proxy /api /health /auth /users /scores /quizzes /rooms /socket.io
  -> https://backend:4000
  -> backend NestJS + Prisma
  -> postgresql://db:5432
```

## Arborescence utile

- `docker-compose.yml`
- `Makefile`
- `backend/`
- `backend/prisma/`
- `frontend/`
- `scripts/smoke-test.sh`
- `scripts/cleanup-smoke-artifacts.sh`
- `.env`
- `.env.example`

## Variables d'environnement

Variables principales:

- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_DB`
- `POSTGRES_PORT`
- `DATABASE_URL`
- `BACKEND_PORT`
- `FRONTEND_PORT`
- `PRISMA_STUDIO_PORT`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `FRONTEND_ORIGIN`
- `GAME_QUESTION_DURATION_MS`

Regles d'equipe:

- ne jamais commit de vrai secret
- garder `.env.example` a jour
- verifier la config avec `make env-check`

## CI GitHub Actions

Le workflow `.github/workflows/ci.yml`:

- build le backend et le frontend
- demarre la stack Docker
- attend les healthchecks
- lance `scripts/smoke-test.sh`

Secrets optionnels acceptes:

- `CI_POSTGRES_USER`
- `CI_POSTGRES_PASSWORD`
- `CI_POSTGRES_DB`
- `CI_POSTGRES_PORT`
- `CI_DATABASE_URL`
- `CI_BACKEND_PORT`
- `CI_FRONTEND_PORT`
- `CI_JWT_SECRET`

Si ces secrets sont absents, des valeurs par defaut dediees a la CI sont utilisees.

## Commandes utiles

### Lancer le projet

```bash
make up
```

### Mode dev

```bash
make dev
```

### Etat rapide

```bash
make ps
make test-stack
```

### Logs

```bash
make logs
make logs-back
make logs-front
make logs-db
```

### Base PostgreSQL

```bash
make shell-db
```

Exemples `psql` utiles:

```sql
\l
\dt
\d "User"
\d "Quiz"
SELECT current_database();
SELECT current_user;
SELECT COUNT(*) FROM "User";
SELECT COUNT(*) FROM "Quiz";
```

### Smoke test

```bash
make smoke-test
```

Ce test verifie:

- la disponibilite de Compose
- la sante des 3 containers
- l'acces backend `/health`
- l'acces frontend `/` et `/health`
- le flux auth `register -> session -> /users/me -> logout`
- le login classique et invite
- quelques validations et erreurs API attendues

### Nettoyage

```bash
make down
make clean
make fclean
```

## Reference des routes backend

Le backend n'utilise pas de prefixe global `/api`.
Les routes reelles sont donc directement:

- `/health`
- `/auth/*`
- `/users/*`
- `/quizzes/*`
- `/scores/*`
- `/rooms/*`

Le backend expose aujourd'hui 32 routes HTTP applicatives, plus `/docs` en mode `development`.

### Regles globales

- `AuthGuard` lit le cookie HTTP-only `access_token`.
- si `AuthGuard` bloque, la reponse est un `401` avec `success: false`
- la plupart des routes JSON retournent ce format:

```json
{
  "success": true,
  "data": {},
  "error": null
}
```

- en cas d'erreur JSON:

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "BAD_REQUEST",
    "message": "..."
  }
}
```

- exceptions a ce format:
  - `/health` retourne un objet brut en succes
  - `/api` retourne un objet brut en succes
  - `/auth/google/start` retourne une redirection HTTP `302`
  - `/auth/google/callback` retourne une redirection HTTP `302`
  - `/docs` sert l'UI Swagger en HTML en mode `development`

### Types de donnees les plus frequents

- `SafeUser`
  - `id`, `email`, `username`, `isGuest`, `avatar_url`, `status`, `createdAt`, `xp`
- `FriendOverview`
  - `friends[]`, `receivedRequests[]`, `sentRequests[]`
- `FriendActionResult`
  - `message`, `friendshipStatus`
- `PrivateConversationSummary`
  - `friendId`, `lastMessagePreview`, `lastMessageAt`, `unreadCount`
- `PrivateMessage`
  - `id`, `senderId`, `receiverId`, `content`, `createdAt`, `readAt`
- `Quiz`
  - `id`, `title`, `questionDurationSec`, `createdAt`, `authorId`, `author`, `questions[]`
- `UserScore`
  - `userId`, `username`, `score`, `wins`
- `QuizUserScore`
  - `userId`, `username`, `score`, `wins`, `gamesPlayed`
- `Room`
  - `id`, `name`, `hostId`, `gameType`, `status`, `maxPlayers`, `quizId`, `createdAt`, `host`, `players`, `_count`

### Routes globales

| Route | AuthGuard | Role | Parametres attendus | Reponse de succes | Reponses d'erreur possibles |
| --- | --- | --- | --- | --- | --- |
| `GET /health` | Non | Healthcheck backend + DB | Aucun | `200` objet brut `{ service, framework, ok, timestamp, database }` | `503` si la base est configuree mais inaccessible |
| `GET /api` | Non | Index minimal de l'API en dev | Aucun | `200` objet brut `{ name, framework, language, orm, message, endpoints[] }` | `404` hors mode `development` |
| `GET /docs` | Non | Swagger UI generee par NestJS | Aucun | `200` HTML Swagger | absent hors mode `development` |

### Routes auth

| Route | AuthGuard | Role | Parametres attendus | Reponse de succes | Reponses d'erreur possibles |
| --- | --- | --- | --- | --- | --- |
| `POST /auth/login` | Non | Authentifier un compte classique et poser le cookie de session | `body { email, password }` avec email valide et mot de passe >= 12 caracteres | `200 ApiResponse<SafeUser>` + cookie `access_token` | `400` validation, `401` identifiants invalides |
| `POST /auth/register` | Non | Creer un compte classique et ouvrir la session | `body { email, username, password }` avec `username` 2-20 caracteres, `password` 12-40 caracteres | `200 ApiResponse<SafeUser>` + cookie `access_token` | `400` validation, `409` email ou pseudo deja utilise |
| `POST /auth/guest` | Non | Creer une session invite | `body { username }` avec `username` 2-20 caracteres | `200 ApiResponse<SafeUser>` + cookie `access_token` | `400` validation, `409` pseudo deja pris |
| `GET /auth/google/start` | Non | Demarrer le flux OAuth Google | query optionnelle `returnTo=/chemin` | `302` vers Google, ou `302` vers `/login?oauthError=google_not_configured` cote frontend | pas de payload JSON; redirection d'echec si config absente |
| `GET /auth/google/callback` | Non | Finaliser le flux OAuth Google | query Google `code`, `state`, ou `error` | `302` vers le frontend cible; session ouverte si succes | redirection d'echec vers `/login?oauthError=...` si state invalide, refus utilisateur ou callback rate |
| `POST /auth/logout` | Non | Supprimer le cookie de session courant | Aucun body utile | `200 ApiResponse<{ loggedOut: true }>` | en pratique pas d'erreur metier attendue; le cookie est nettoye meme s'il est invalide |
| `GET /auth/session` | Non | Recuperer la session courante si elle existe | Aucun | `200 ApiResponse<SafeUser \| null>` | pas d'erreur metier attendue; retourne `null` si pas de session ou cookie invalide |

### Routes users

| Route | AuthGuard | Role | Parametres attendus | Reponse de succes | Reponses d'erreur possibles |
| --- | --- | --- | --- | --- | --- |
| `GET /users/me` | Oui | Recuperer le profil public du compte courant | Aucun | `200 ApiResponse<SafeUser>` | `401` session absente/invalide, `404` user introuvable |
| `PATCH /users/me/avatar` | Oui | Ajouter, remplacer ou supprimer son avatar | `body { avatarDataUrl }` ou `null`; data URL JPG/PNG/WEBP, max 2 Mo | `200 ApiResponse<SafeUser>` | `400` validation ou format d'image invalide, `401`, `404` |
| `PATCH /users/me/profile` | Oui | Changer son pseudo et son statut | `body { username, status }` avec `status` dans `online` ou `offline` | `200 ApiResponse<SafeUser>` | `400` validation, `401`, `404`, `409` pseudo deja pris |
| `GET /users/me/friends` | Oui | Recuperer la vue consolidee du reseau d'amis | Aucun | `200 ApiResponse<FriendOverview>` | `401`, `403` si compte invite, `404` user introuvable |
| `POST /users/me/friends` | Oui | Envoyer une demande d'ami par pseudo | `body { username }` | `200 ApiResponse<FriendActionResult>` | `400` pseudo invalide ou auto-ajout, `401`, `403` si compte invite, `404` utilisateur cible introuvable, `409` deja ami, demande deja envoyee ou pseudo ambigu |
| `PATCH /users/me/friends/requests/:requestId` | Oui | Accepter ou refuser une demande recue | `path requestId:int`, `body { action }` avec `accepted` ou `declined` | `200 ApiResponse<FriendActionResult>` | `400` validation, `401`, `403` si ce n'est pas votre demande ou compte invite, `404` demande introuvable, `409` demande deja traitee ou expediteur guest |
| `DELETE /users/me/friends/:friendId` | Oui | Retirer un ami et supprimer l'historique prive associe | `path friendId:int` | `200 ApiResponse<{ message: string }>` | `400` si on tente de se supprimer soi-meme, `401`, `403` si compte invite, `404` utilisateur ou relation introuvable |
| `GET /users/me/friends/conversations` | Oui | Recuperer le resume des conversations privees | Aucun | `200 ApiResponse<PrivateConversationSummary[]>` | `401`, `403` si compte invite, `404` user introuvable |
| `GET /users/me/friends/messages/:friendId` | Oui | Recuperer une conversation privee complete et marquer les messages recus comme lus | `path friendId:int` | `200 ApiResponse<PrivateMessage[]>` | `401`, `403` si non-ami ou compte invite, `404` utilisateur introuvable |
| `POST /users/me/friends/messages/:friendId` | Oui | Envoyer un message prive a un ami | `path friendId:int`, `body { content }` avec 1 a 1000 caracteres | `200 ApiResponse<PrivateMessage>` | `400` validation, `401`, `403` si non-ami ou compte invite, `404` utilisateur introuvable, `429` limite anti-spam atteinte |
| `GET /users/:id` | Non | Recuperer le profil public d'un utilisateur | `path id:int` | `200 ApiResponse<SafeUser>` | `400` si `id` n'est pas un entier, `404` user introuvable |

### Routes quizzes

| Route | AuthGuard | Role | Parametres attendus | Reponse de succes | Reponses d'erreur possibles |
| --- | --- | --- | --- | --- | --- |
| `GET /quizzes` | Non | Lister tous les quiz disponibles | Aucun | `200 ApiResponse<Quiz[]>` | peu d'erreurs metier attendues |
| `GET /quizzes/me` | Oui | Lister uniquement les quiz crees par l'utilisateur connecte | Aucun | `200 ApiResponse<Quiz[]>` | `401` |
| `GET /quizzes/:quizId` | Non | Recuperer le detail complet d'un quiz | `path quizId:int` | `200 ApiResponse<Quiz>` | `400` si `quizId` invalide, `404` quiz introuvable |
| `POST /quizzes` | Oui | Creer un quiz complet avec ses questions | `body { title, questionDurationSec?, questions[] }`; `questionDurationSec` dans `0`, `10`, `30` ou `null`; 1 a 50 questions; 2 a 4 reponses par question; `correctAnswerIndex` coherent | `200 ApiResponse<Quiz>` | `400` validation ou `correctAnswerIndex` invalide, `401` |
| `PATCH /quizzes/:quizId` | Oui | Mettre a jour un quiz existant | meme body que creation + `path quizId:int` | `200 ApiResponse<Quiz>` | `400` validation ou quiz ne vous appartient pas, `401`, `404` quiz introuvable |
| `DELETE /quizzes/:quizId` | Oui | Supprimer un quiz | `path quizId:int` | `200 ApiResponse<void>` avec `data` vide | `400` si quiz non possede ou encore utilise, `401`, `404` quiz introuvable |

### Routes scores

| Route | AuthGuard | Role | Parametres attendus | Reponse de succes | Reponses d'erreur possibles |
| --- | --- | --- | --- | --- | --- |
| `GET /scores/leaderboard` | Non | Recuperer le leaderboard global en memoire | query optionnelle `limit:int`, defaut `10` | `200 ApiResponse<UserScore[]>` | `400` si `limit` invalide |
| `GET /scores/leaderboard/wins` | Non | Recuperer le classement par nombre total de victoires | query optionnelle `limit:int`, defaut `10` | `200 ApiResponse<{ userId, username, totalWins }[]>` | `400` si `limit` invalide |
| `GET /scores/users/:userId/wins-rank` | Non | Recuperer les stats de victoires et le rang theorique d'un utilisateur | `path userId:int` | `200 ApiResponse<{ userId, totalWins, gamesPlayed, rank }>` | `400` si `userId` invalide |
| `GET /scores/users/:userId` | Non | Recuperer le score global d'un utilisateur dans le leaderboard en memoire | `path userId:int` | `200 ApiResponse<UserScore>` | `400` si `userId` invalide, `404` si aucun score connu en memoire |
| `GET /scores/quizzes/:quizId/leaderboard` | Non | Recuperer le leaderboard persistant d'un quiz | `path quizId:int`, query optionnelle `limit:int`, defaut `10` | `200 ApiResponse<QuizUserScore[]>` | `400` si `quizId` ou `limit` invalide; tableau vide possible si aucun score |

### Routes rooms

Toutes les routes du controller `rooms` sont protegees au niveau classe par `@UseGuards(AuthGuard)`.

| Route | AuthGuard | Role | Parametres attendus | Reponse de succes | Reponses d'erreur possibles |
| --- | --- | --- | --- | --- | --- |
| `GET /rooms` | Oui | Lister les rooms en attente uniquement | Aucun | `200 ApiResponse<Room[]>` | `401` |
| `POST /rooms` | Oui | Creer une room et y inscrire l'hote | `body { gameType, maxPlayers?, name?, quizId? }`; `gameType` vaut actuellement `QUIZ`; `maxPlayers` entre `2` et `10`; si absent, la valeur appliquee par le controller est `5` | `200 ApiResponse<Room>` | `400` validation, `401` |

### Temps reel hors scope REST

- le backend expose aussi Socket.IO sur `/socket.io`
- les rooms et parties temps reel passent majoritairement par `backend/src/modules/rooms/rooms.gateway.ts`
- ce ne sont pas des routes HTTP REST, donc elles ne sont pas detaillees dans ce tableau

## Notes importantes

- Le module `rooms` est present et expose a la fois des routes REST et un gateway Socket.IO.
- Le gameplay `wordle` n'est plus supporte dans la base ni dans les docs.
- Le leaderboard global est garde en memoire par le backend.
- Le leaderboard par quiz est persiste en PostgreSQL.
