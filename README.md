*This project has been created as part of the 42 curriculum by asritz, hucherea, lscheupl, tcohen.*

# ft_transcendence - Quiz Room

## Description

`ft_transcendence - Quiz Room` is our quiz-focused implementation of the 42 `ft_transcendence` project.
It is a full-stack web application where users can register, log in, manage a profile, add friends, chat, create quizzes, join multiplayer rooms, and play real-time quiz matches from separate machines.

The main goal of the project is to deliver a modern web platform that combines:

- user management,
- social interaction,
- real-time multiplayer gameplay,
- persistent statistics,
- and production-style tooling such as monitoring, validation, and containerized deployment.

### Key Features

- Local authentication, guest access, and Google OAuth 2.0 login
- Profile management with avatar, status, and XP
- Friends system and private messaging
- Quiz creation, edition, browsing, and ownership
- Real-time room system with WebSocket events
- Remote multiplayer quiz matches, including games with more than two players
- Match history, wins tracking, and quiz leaderboards
- Monitoring with Prometheus, Grafana, and Node Exporter
- Docker-based local HTTPS environment for consistent team development

## Team Information

| Login | Assigned Role(s) | Responsibilities |
| --- | --- | --- |
| `asritz` | Tech Lead, Full-stack Developer | Defined major technical directions, contributed to the frontend/backend framework setup, and implemented the monitoring stack with Grafana-based observability. |
| `hucherea` | Real-time Developer, QA/Compatibility Developer | Worked on WebSocket-driven multiplayer behavior, multi-player room flows, browser compatibility, and game statistics features. |
| `lscheupl` | Gameplay Developer, Database Developer | Implemented the web-based quiz game, remote player gameplay, and ORM-backed data flows used by the game features. |
| `tcohen` | Project Manager, Full-stack Developer | Coordinated feature delivery and worked on user management, profile/social features, friends, private messages, and remote authentication. |

## Project Management

### How We Organized the Work

- We split the project by functional ownership: authentication, social features, gameplay, real-time systems, ORM/database, and monitoring.
- We worked with feature branches, then merged reviewed work back into shared branches.
- We used regular sync points to unblock each other, review architecture choices, and validate module coverage.
- We relied on peer review and shared manual testing before considering a feature complete.

### Tools Used

- Git and GitHub for version control
- GitHub Issues and pull requests for task tracking and review
- Docker Compose for shared development workflows
- Swagger, smoke tests, and local scripts for validation

### Communication Channels

- Discord for day-to-day communication
- In-person or live team discussions for architecture, debugging, and module planning

## Technical Stack

### Frontend

- React 18
- TypeScript
- React Router
- Webpack Dev Server
- Tailwind CSS 4
- Socket.IO client
- MobX / mobx-react-lite

Why we chose it:

- React gave us a component-based SPA structure that fits a dynamic multiplayer UI.
- TypeScript improved maintainability and reduced cross-layer mistakes.
- Socket.IO client made room updates and live gameplay synchronization easier to manage.

### Backend

- NestJS
- TypeScript
- Prisma ORM
- JWT authentication with HTTP-only cookies
- Swagger/OpenAPI in development
- Prometheus metrics endpoint

Why we chose it:

- NestJS provides a clean module/controller/service architecture that scales well for a team project.
- Prisma gave us typed data access, migrations, and a single schema source of truth.
- Cookie-based JWT sessions are practical for browser authentication while keeping tokens out of frontend JavaScript storage.

### Database

- PostgreSQL 16

Why we chose it:

- The project has strongly relational data: users, friend requests, messages, quizzes, rooms, and match history.
- PostgreSQL is robust, well documented, and works very well with Prisma.

### Other Significant Technologies

- Docker and Docker Compose
- OpenSSL for local HTTPS certificates
- Prometheus
- Grafana
- Node Exporter
- Bash utility scripts

### Major Technical Choices

- We used a framework on both the frontend and backend to keep the code modular and scalable.
- We kept the stack containerized so every team member could run the same environment.
- We used WebSockets for room/game synchronization because polling would not be responsive enough for multiplayer gameplay.
- We added monitoring to observe application and host metrics in real time and to satisfy the observability module with a practical setup.

## Database Schema

### Structure Overview

The database is defined in [backend/prisma/schema.prisma](backend/prisma/schema.prisma) and centers on users, quizzes, rooms, social relationships, and match statistics.

```text
User
 ├─< FriendRequests >─ User
 ├─< PrivateMessage >─ User
 ├─< QuizLeaderboard >─ Quiz
 ├─< RoomPlayer >─ Room >─ Quiz
 ├─< MatchHistoryPlayer >─ MatchHistory
 └─< Quiz (author)

Quiz
 └─< QuizQuestion
```

### Main Tables and Relationships

| Table / Model | Purpose | Important Relationships |
| --- | --- | --- |
| `User` | Stores registered and guest accounts | Linked to friend requests, private messages, rooms, quizzes, leaderboard entries, and match history |
| `FriendRequests` | Stores pending/accepted/declined friendship states | `senderId -> User`, `receiverId -> User` |
| `PrivateMessage` | Stores direct messages between users | `senderId -> User`, `receiverId -> User` |
| `Quiz` | Stores quiz metadata | Optional `authorId -> User`, one-to-many with `QuizQuestion`, one-to-many with `QuizLeaderboard`, optional relation to `Room` |
| `QuizQuestion` | Stores quiz questions and answers | `quizId -> Quiz` |
| `QuizLeaderboard` | Stores persistent per-quiz rankings | `quizId -> Quiz`, `userId -> User` |
| `Room` | Stores multiplayer game rooms | `hostId -> User`, optional `quizId -> Quiz`, one-to-many with `RoomPlayer` |
| `RoomPlayer` | Stores room membership and runtime player state | `roomId -> Room`, `userId -> User` |
| `MatchHistory` | Stores completed match sessions | One-to-many with `MatchHistoryPlayer` |
| `MatchHistoryPlayer` | Stores per-player results for a match | `matchId -> MatchHistory`, `userId -> User` |

### Key Fields and Data Types

| Model | Key Fields |
| --- | --- |
| `User` | `id: Int`, `email: String`, `username: String`, `isGuest: Boolean`, `googleId: String?`, `avatar_url: String?`, `status: UserStatus`, `xp: Int`, `createdAt: DateTime` |
| `FriendRequests` | `id: Int`, `senderId: Int`, `receiverId: Int`, `status: FriendshipStatus`, `createdAt: DateTime` |
| `PrivateMessage` | `id: Int`, `senderId: Int`, `receiverId: Int`, `content: String`, `createdAt: DateTime`, `readAt: DateTime?` |
| `Quiz` | `id: Int`, `title: String`, `questionDurationSec: Int?`, `authorId: Int?`, `createdAt: DateTime` |
| `QuizQuestion` | `id: Int`, `quizId: Int`, `questionText: String`, `answers: Json`, `correctAnswer: String`, `position: Int`, `points: Int` |
| `QuizLeaderboard` | `id: Int`, `quizId: Int`, `userId: Int`, `totalScore: Int`, `wins: Int`, `gamesPlayed: Int`, `updatedAt: DateTime` |
| `Room` | `id: String (UUID)`, `name: String?`, `status: RoomStatus`, `gameType: GameType`, `maxPlayers: Int`, `hostId: Int`, `quizId: Int?` |
| `RoomPlayer` | `id: Int`, `roomId: String`, `userId: Int`, `isReady: Boolean`, `isConnected: Boolean`, `score: Int` |
| `MatchHistory` | `id: Int`, `gameType: GameType`, `durationSec: Int?`, `createdAt: DateTime` |
| `MatchHistoryPlayer` | `id: Int`, `matchId: Int`, `userId: Int`, `score: Int`, `isWinner: Boolean` |

## Features List

| Feature | Team Member(s) | What It Does |
| --- | --- | --- |
| Local authentication | `tcohen` | Lets users register, log in, log out, and keep a browser session through HTTP-only JWT cookies. |
| Guest mode | `tcohen` | Lets users enter the platform quickly without a full account flow. |
| Google OAuth 2.0 | `tcohen` | Adds remote authentication for users who prefer signing in with Google. |
| Profile management | `tcohen` | Lets users edit username, avatar, and visible profile data. |
| Online status and XP | `tcohen`, `hucherea` | Tracks user presence and progression-related information. |
| Friends system | `tcohen` | Allows sending, accepting, declining, and removing friend requests. |
| Private messaging | `tcohen` | Allows accepted friends to exchange direct messages. |
| Quiz management | `lscheupl` | Lets users create, edit, browse, and own quizzes and their questions. |
| Room creation and lobby flow | `lscheupl`, `hucherea` | Lets authenticated users create rooms, join waiting rooms, and manage readiness/game setup. |
| Real-time room synchronization | `hucherea` | Broadcasts room state updates, player actions, and chat/game events through WebSockets. |
| Web-based multiplayer quiz game | `lscheupl`, `hucherea` | Runs quiz matches in the browser with live progression and scoring. |
| Remote play on separate machines | `lscheupl` | Supports players joining and playing from different computers. |
| Multiplayer games with 3+ players | `hucherea` | Extends gameplay beyond a 1v1-only setup. |
| Match history and leaderboards | `hucherea` | Stores wins, scores, and per-quiz rankings for post-game statistics. |
| ORM-backed persistence | `lscheupl` | Centralizes database access with Prisma schema, migrations, and typed queries. |
| Monitoring and observability | `asritz` | Exposes metrics and dashboards with Prometheus, Grafana, and Node Exporter. |
| Room chat | `hucherea` | Lets players exchange messages inside live multiplayer rooms. |
| Browser compatibility work | `hucherea` | Improves support beyond Chromium-based browsers, with compatibility work targeting Firefox and Safari. |

## Modules

Total module points selected: **22**

| Module | Type | Points | Team Member(s) | Why We Chose It | How It Was Implemented |
| --- | --- | ---: | --- | --- | --- |
| Use a framework for both frontend and backend | Major | 2 | `asritz` | We wanted a scalable and maintainable architecture for a large team project. | React powers the SPA frontend and NestJS powers the modular backend. |
| Use a frontend framework | Minor | 1 | `asritz` | The UI required routing, reusable components, and interactive state updates. | The frontend is built with React 18, TypeScript, and React Router. |
| Use a backend framework | Minor | 1 | `asritz` | The backend needed clear separation of concerns and extensible modules. | NestJS controllers, services, guards, DTOs, and modules structure the API. |
| Implement real-time features | Major | 2 | `hucherea` | Multiplayer rooms and live games need instant updates. | A Socket.IO gateway broadcasts room events, chat messages, readiness changes, and game progression. |
| Allow users to interact with other users | Major | 2 | `tcohen` | Social interaction is a core part of the project subject. | The app includes friends, friend requests, private conversations, and user discovery endpoints. |
| Use an ORM | Minor | 1 | `lscheupl` | The data model is relational and benefits from typed queries and migrations. | Prisma manages schema definition, client generation, and database migrations. |
| Support for additional browsers | Minor | 1 | `hucherea` | A web project should not be limited to one browser family. | The frontend and auth/session flows were adjusted with compatibility work targeting Firefox and Safari in addition to Chromium-based browsers. |
| Standard user management | Major | 2 | `tcohen` | Identity and profile handling are mandatory foundations for the platform. | The project includes registration, login, guest users, session retrieval, profile edition, avatar support, and status handling. |
| Game statistics and match history | Minor | 1 | `hucherea` | Replayability and competition are stronger with visible progress and history. | Wins, scores, quiz leaderboards, and match-history-linked data are stored and exposed through score endpoints. |
| Remote authentication | Minor | 1 | `tcohen` | OAuth improves usability and satisfies the remote auth module. | Google OAuth 2.0 / OIDC is integrated with start and callback flows on the backend. |
| Web-based game | Major | 2 | `lscheupl` | We wanted the core game to run directly in the browser with no native client. | The quiz game is implemented as a browser-based multiplayer experience using the React frontend and the NestJS backend. |
| Remote players | Major | 2 | `lscheupl` | Multiplayer should work across separate computers, not only the same machine. | Players can connect to the same room remotely and receive synchronized game state through HTTP + WebSockets. |
| Multiplayer for more than two players | Major | 2 | `hucherea` | We wanted rooms to support group play, not only duel-style matches. | Room configuration and room-player state support 3+ simultaneous players. |
| Grafana monitoring | Major | 2 | `asritz` | Observability helps both debugging and demonstration of system health. | Prometheus scrapes backend and host metrics, while Grafana serves pre-provisioned dashboards. |

## Individual Contributions

### `asritz`

- Helped shape the project architecture around a framework-based full-stack approach.
- Worked on the React/NestJS setup choices and overall technical direction.
- Implemented the monitoring module with Prometheus, Grafana, dashboards, and provisioning.
- Main challenge: turning observability into a useful module rather than a cosmetic add-on.
- How it was handled: metrics were connected to concrete gameplay/backend signals such as active rooms and WebSocket activity.

### `hucherea`

- Implemented the real-time multiplayer layer with WebSocket room synchronization.
- Worked on multi-player game support, browser compatibility, and statistics-related features.
- Contributed to room/game state handling, broadcasting, and compatibility testing.
- Main challenge: keeping room state synchronized across joins, disconnects, and ongoing games.
- How it was handled: events were centralized in the room gateway/service flow and reinforced with validation and cleanup logic.

### `lscheupl`

- Implemented the browser-based quiz gameplay and remote-player game flow.
- Worked on ORM-backed persistence and data flows used by quizzes and gameplay.
- Contributed to room/game integration and quiz-oriented application behavior.
- Main challenge: connecting quiz content, room state, and scoring in one consistent user flow.
- How it was handled: Prisma-backed models and service-layer logic were used to keep gameplay data coherent.

### `tcohen`

- Coordinated project progress and contributed to the user-facing product flow.
- Implemented standard user management, profiles, friend relationships, and private messaging.
- Added remote authentication through Google OAuth 2.0.
- Main challenge: combining authentication, social features, and session handling cleanly in the same platform.
- How it was handled: guarded routes, typed DTOs, and cookie-based authentication were used to keep the user flows consistent.

## Instructions

### Prerequisites

Required:

- `make`
- Docker + Docker Compose, or Podman + Podman Compose
- `openssl`
- a Bash-compatible shell

Optional for manual local work outside containers:

- Node.js 20 for the frontend
- Node.js 22 for the backend
- PostgreSQL 16

### Environment Setup

1. Clone the repository and move to the project root.

2. Create the root `.env` file from the example:

```bash
make env-init
```

3. Open `.env` and adjust values if needed.

4. Validate your host configuration and environment:

```bash
make setup-host
make env-check
```

5. Start the application:

```bash
make up
```

6. Open the frontend in your browser:

```text
https://localhost:3000
```

### Important Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `POSTGRES_USER` | Yes | PostgreSQL username |
| `POSTGRES_PASSWORD` | Yes | PostgreSQL password |
| `POSTGRES_DB` | Yes | PostgreSQL database name |
| `POSTGRES_PORT` | Yes | Exposed PostgreSQL port |
| `DATABASE_URL` | Yes | Prisma connection string |
| `BACKEND_PORT` | Yes | Exposed backend HTTPS port |
| `FRONTEND_PORT` | Yes | Exposed frontend HTTPS port |
| `JWT_SECRET` | Yes | Secret used to sign JWTs |
| `JWT_EXPIRES_IN` | Yes | Session lifetime |
| `FRONTEND_ORIGIN` | Yes | Allowed frontend origin |
| `GAME_QUESTION_DURATION_MS` | Yes | Default question duration |
| `GOOGLE_CLIENT_ID` | No | Needed only for Google OAuth |
| `GOOGLE_CLIENT_SECRET` | No | Needed only for Google OAuth |
| `GOOGLE_REDIRECT_URI` | No | Needed only for Google OAuth |
| `PRISMA_STUDIO_PORT` | No | Used by `make dev` |
| `PROMETHEUS_PORT` | No | Monitoring stack port |
| `GRAFANA_PORT` | No | Grafana port |
| `GRAFANA_ADMIN_USER` | No | Grafana admin login |
| `GRAFANA_ADMIN_PASSWORD` | No | Grafana admin password |

### Run the Project

Recommended standard startup:

```bash
make up
```

Development mode with Swagger and Prisma Studio:

```bash
make dev
```

Start monitoring services:

```bash
make monitoring
```

### Useful URLs

- Frontend: `https://localhost:3000`
- Backend health: `https://localhost:4000/health`
- Backend API summary: `https://localhost:4000/api`
- Swagger in development: `https://localhost:4000/docs`
- Metrics endpoint: `https://localhost:4000/metrics`
- Prisma Studio in development: `http://127.0.0.1:5555`
- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3001`

### Testing and Verification

Quick stack status:

```bash
make test-stack
```

General smoke test:

```bash
make smoke-test
```

Useful maintenance commands:

```bash
make logs
make down
make clean
```

### Notes

- The recommended workflow is the Docker-based one.
- Local HTTPS certificates are generated for development.
- Google OAuth is optional and only works when the related environment variables are configured.

## Resources

### Project Documentation

- [README.md](README.md)
- [docs/TECH.md](docs/TECH.md)
- [docs/DEVDOC.MD](docs/DEVDOC.MD)
- [monitoring/README.md](monitoring/README.md)

### Classic References

- [React Documentation](https://react.dev/)
- [NestJS Documentation](https://docs.nestjs.com/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Socket.IO Documentation](https://socket.io/docs/v4/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [OAuth 2.0 Overview](https://oauth.net/2/)
- [Prometheus Documentation](https://prometheus.io/docs/introduction/overview/)
- [Grafana Documentation](https://grafana.com/docs/)

### How AI Was Used

AI was used as a productivity tool for repetitive or tedious tasks, not as a substitute for understanding or team collaboration.

Used for:

- restructuring and improving documentation in English, including this README,
- brainstorming test ideas and edge cases,
- reviewing repetitive validation patterns,
- comparing implementation options during debugging or refactoring,
- drafting command reminders or technical explanations for known tools.

Used on parts related to:

- documentation,
- validation and review support,
- debugging assistance,
- development workflow support.

Rules we followed:

- We first discussed problems as a team before prompting.
- We only kept AI-generated suggestions that we fully understood and could explain.
- We systematically reviewed, tested, questioned, and, when needed, rewrote AI-generated output.
- We relied on peer review instead of trusting AI output alone.
- We used AI to save time on repetitive work, while keeping design decisions, implementation ownership, and final responsibility within the team.

In short, AI helped us move faster on low-value repetition, but final technical decisions, code validation, and project accountability remained human and collective.
