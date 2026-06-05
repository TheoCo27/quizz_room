#!/usr/bin/env bash

set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
cd "$ROOT_DIR"
. "${ROOT_DIR}/scripts/lib/runtime.sh"

SCOPE="${1:---scope=all}"

case "$SCOPE" in
	--scope=all)
		SMOKE_USER_WHERE="email LIKE 'smoke-api-%@test.com'"
		;;
	*)
		printf '[KO] Scope de cleanup inconnu: %s\n' "$SCOPE" >&2
		exit 1
		;;
esac

SMOKE_QUIZ_WHERE="title LIKE 'Smoke API Quiz %'"
SMOKE_ROOM_WHERE="name LIKE 'Smoke API Room %'"
SMOKE_USER_IDS_QUERY="SELECT id FROM \\\"User\\\" WHERE ${SMOKE_USER_WHERE}"
SMOKE_QUIZ_IDS_QUERY="SELECT id FROM \\\"Quiz\\\" WHERE ${SMOKE_QUIZ_WHERE}"
SMOKE_ROOM_IDS_QUERY="SELECT id FROM \\\"Room\\\" WHERE ${SMOKE_ROOM_WHERE} OR \\\"hostId\\\" IN (${SMOKE_USER_IDS_QUERY}) OR \\\"quizId\\\" IN (${SMOKE_QUIZ_IDS_QUERY})"

run_database_query() {
	query="$1"

	run_container_engine exec -i quiz_db sh -lc \
		"PGPASSWORD=\"\$POSTGRES_PASSWORD\" psql -h 127.0.0.1 -U \"\$POSTGRES_USER\" -d \"\$POSTGRES_DB\" -v ON_ERROR_STOP=1 -t -A -c \"$query\""
}

query_csv() {
	query="$1"

	run_database_query "$query" | tr -d '\r[:space:]'
}

cleanup_database_artifacts() {
	run_database_query "DELETE FROM \\\"PrivateMessage\\\" WHERE \\\"senderId\\\" IN (${SMOKE_USER_IDS_QUERY}) OR \\\"receiverId\\\" IN (${SMOKE_USER_IDS_QUERY});" \
		>/dev/null 2>&1 || true
	run_database_query "DELETE FROM \\\"FriendRequests\\\" WHERE \\\"senderId\\\" IN (${SMOKE_USER_IDS_QUERY}) OR \\\"receiverId\\\" IN (${SMOKE_USER_IDS_QUERY});" \
		>/dev/null 2>&1 || true
	run_database_query "DELETE FROM \\\"MatchHistoryPlayer\\\" WHERE \\\"userId\\\" IN (${SMOKE_USER_IDS_QUERY});" \
		>/dev/null 2>&1 || true
	run_database_query "DELETE FROM \\\"MatchHistory\\\" WHERE NOT EXISTS (SELECT 1 FROM \\\"MatchHistoryPlayer\\\" WHERE \\\"MatchHistoryPlayer\\\".\\\"matchId\\\" = \\\"MatchHistory\\\".id);" \
		>/dev/null 2>&1 || true
	run_database_query "DELETE FROM \\\"RoomPlayer\\\" WHERE \\\"roomId\\\" IN (${SMOKE_ROOM_IDS_QUERY}) OR \\\"userId\\\" IN (${SMOKE_USER_IDS_QUERY});" \
		>/dev/null 2>&1 || true
	run_database_query "DELETE FROM \\\"Room\\\" WHERE id IN (${SMOKE_ROOM_IDS_QUERY});" \
		>/dev/null 2>&1 || true
	run_database_query "DELETE FROM \\\"QuizLeaderboard\\\" WHERE \\\"quizId\\\" IN (${SMOKE_QUIZ_IDS_QUERY}) OR \\\"userId\\\" IN (${SMOKE_USER_IDS_QUERY});" \
		>/dev/null 2>&1 || true
	run_database_query "DELETE FROM \\\"QuizQuestion\\\" WHERE \\\"quizId\\\" IN (${SMOKE_QUIZ_IDS_QUERY});" \
		>/dev/null 2>&1 || true
	run_database_query "DELETE FROM \\\"Quiz\\\" WHERE id IN (${SMOKE_QUIZ_IDS_QUERY}) OR \\\"authorId\\\" IN (${SMOKE_USER_IDS_QUERY});" \
		>/dev/null 2>&1 || true
	run_database_query "DELETE FROM \\\"User\\\" WHERE id IN (${SMOKE_USER_IDS_QUERY});" \
		>/dev/null 2>&1 || true
}

main() {
	cleanup_database_artifacts
}

main
