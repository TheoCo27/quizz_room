#!/usr/bin/env bash

set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
cd "$ROOT_DIR"
. "${ROOT_DIR}/scripts/lib/runtime.sh"

FRONTEND_PORT="${FRONTEND_PORT:-3000}"
BACKEND_PORT="${BACKEND_PORT:-4000}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
BACKEND_BASE_URL="https://localhost:${BACKEND_PORT}"
FRONTEND_BASE_URL="${FRONTEND_ORIGIN:-https://localhost:${FRONTEND_PORT}}"
TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/ft_transcendance_smoke.XXXXXX")"
TLS_CA_FILE="${ROOT_DIR}/certs/dev-localhost-ca.pem"
COOKIE_JAR="${TMP_DIR}/cookies.txt"
LAST_BODY=""
LAST_HEADERS=""
LAST_STATUS=""

pass() {
	printf '[OK] %s\n' "$1"
}

fail() {
	printf '[KO] %s\n' "$1" >&2
	exit 1
}

section() {
	printf '\n== %s ==\n' "$1"
}

print_test_catalog() {
	printf '\nTypologies de test executees:\n'
	printf ' - test dev op\n'
	printf ' - test db\n'
	printf ' - test authentication\n'
	printf ' - test users\n'
	printf ' - test quizzes\n'
	printf ' - test scores\n'
	printf ' - test rooms\n'
	printf ' - test front end\n'
}

check_command() {
	command -v "$1" >/dev/null 2>&1 || fail "Commande manquante: $1"
}

container_health() {
	run_container_engine inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$1" 2>/dev/null
}

check_container() {
	name="$1"
	retries="${2:-15}"
	status=""

	while [ "$retries" -gt 0 ]; do
		status="$(container_health "$name")"
		if [ "$status" = "healthy" ]; then
			pass "Container $name healthy"
			return 0
		fi

		retries=$((retries - 1))
		sleep 2
	done

	[ "$status" = "healthy" ] || fail "Container $name non healthy (etat: ${status:-inconnu})"
	pass "Container $name healthy"
}

check_http_with_curl() {
	url="$1"
	expected="$2"

	if printf '%s' "$url" | grep -Eq '^https://'; then
		body="$(curl --cacert "$TLS_CA_FILE" -fsS "$url")" || return 1
	else
		body="$(curl -fsS "$url")" || return 1
	fi

	printf '%s' "$body" | grep -F -q "$expected" || fail "Reponse inattendue sur $url"
	pass "Endpoint $url OK"
}

check_http_inside_container() {
	container="$1"
	url="$2"
	expected="$3"

	if printf '%s' "$url" | grep -Eq '^https://'; then
		body="$(run_container_engine exec "$container" sh -lc "NODE_EXTRA_CA_CERTS=/certs/dev-localhost-ca.pem node -e \"fetch('${url}').then(async (response) => { if (!response.ok) process.exit(1); process.stdout.write(await response.text()); }).catch(() => process.exit(1))\"")" || return 1
	else
		body="$(run_container_engine exec "$container" sh -lc "wget -qO- '$url'")" || return 1
	fi

	printf '%s' "$body" | grep -F -q "$expected" || fail "Reponse inattendue depuis $container sur $url"
	pass "Endpoint $url OK via $container"
}

run_database_query() {
	query="$1"

	run_container_engine exec -i quiz_db sh -lc \
		"PGPASSWORD=\"\$POSTGRES_PASSWORD\" psql -h 127.0.0.1 -U \"\$POSTGRES_USER\" -d \"\$POSTGRES_DB\" -v ON_ERROR_STOP=1 -t -A -c \"$query\""
}

check_database_credentials() {
	if ! result="$(run_database_query "SELECT current_user || '|' || current_database();" 2>&1)"; then
		fail "Connexion PostgreSQL impossible avec les credentials du conteneur db. Verifie .env puis reinitialise le volume avec 'make fclean' si POSTGRES_USER/POSTGRES_PASSWORD/POSTGRES_DB ont change depuis la creation du volume."
	fi

	result="$(printf '%s' "$result" | tr -d '\r' | head -n 1)"
	assert_not_empty "$result" "connexion PostgreSQL"
	pass "Credentials PostgreSQL valides pour quiz_db (${result})"
}

check_database_query() {
	label="$1"
	query="$2"
	expected="$3"

	if ! result="$(run_database_query "$query" 2>&1)"; then
		fail "Requete DB impossible pour $label. Verifie les credentials PostgreSQL et l'etat du volume Docker."
	fi

	result="$(printf '%s' "$result" | tr -d '\r[:space:]')"
	[ "$result" = "$expected" ] || fail "Resultat DB inattendu pour $label: attendu '$expected', recu '$result'"
	pass "$label"
}

request_with_curl() {
	method="$1"
	url="$2"
	data="${3:-}"
	cookie_jar="${4:-}"
	extra_header="${5:-}"
	body_file="${TMP_DIR}/body"
	headers_file="${TMP_DIR}/headers"
	curl_args=(-sS -o "$body_file" -D "$headers_file" -w "%{http_code}" -X "$method" "$url")

	if [ -n "$cookie_jar" ]; then
		curl_args+=(-b "$cookie_jar" -c "$cookie_jar")
	fi

	if [ -n "$extra_header" ]; then
		curl_args+=(-H "$extra_header")
	fi

	if [ -n "$data" ]; then
		curl_args+=(-H "Content-Type: application/json" -d "$data")
	fi

	if printf '%s' "$url" | grep -Eq '^https://'; then
		curl_args+=(--cacert "$TLS_CA_FILE")
	fi

	LAST_STATUS="$(curl "${curl_args[@]}")" || return 1
	LAST_BODY="$(cat "$body_file")"
	LAST_HEADERS="$(cat "$headers_file")"
	assert_no_server_error
}

assert_status() {
	expected="$1"
	[ "$LAST_STATUS" = "$expected" ] || fail "Statut HTTP inattendu: attendu $expected, recu $LAST_STATUS, body: $LAST_BODY"
}

assert_status_any() {
	expected_a="$1"
	expected_b="$2"
	[ "$LAST_STATUS" = "$expected_a" ] || [ "$LAST_STATUS" = "$expected_b" ] \
		|| fail "Statut HTTP inattendu: attendu $expected_a ou $expected_b, recu $LAST_STATUS, body: $LAST_BODY"
}

assert_body_contains() {
	expected="$1"
	printf '%s' "$LAST_BODY" | grep -F -q "$expected" \
		|| fail "Body inattendu. Fragment manquant: $expected. Body: $LAST_BODY"
}

assert_body_not_contains() {
	unexpected="$1"
	if printf '%s' "$LAST_BODY" | grep -F -q "$unexpected"; then
		fail "Body inattendu. Fragment present: $unexpected. Body: $LAST_BODY"
	fi
}

assert_no_server_error() {
	if [ -n "$LAST_STATUS" ] && [ "$LAST_STATUS" -ge 500 ] 2>/dev/null; then
		fail "Erreur serveur detectee (HTTP $LAST_STATUS). Body: $LAST_BODY"
	fi

	assert_body_not_contains '"code":"INTERNAL_SERVER_ERROR"'
	assert_body_not_contains '"message":"Internal server error"'
}

assert_headers_contains() {
	expected="$1"
	printf '%s' "$LAST_HEADERS" | grep -F -q "$expected" \
		|| fail "Headers inattendus. Fragment manquant: $expected. Headers: $LAST_HEADERS"
}

assert_headers_contains_any() {
	expected_a="$1"
	expected_b="$2"

	if printf '%s' "$LAST_HEADERS" | grep -F -q "$expected_a"; then
		return 0
	fi

	if printf '%s' "$LAST_HEADERS" | grep -F -q "$expected_b"; then
		return 0
	fi

	fail "Headers inattendus. Fragments absents: $expected_a / $expected_b. Headers: $LAST_HEADERS"
}

assert_cookie_jar_has_cookie() {
	cookie_jar="$1"
	cookie_name="$2"

	[ -f "$cookie_jar" ] || fail "Cookie jar absent: $cookie_jar"

	cookie_value="$(awk -v name="$cookie_name" 'BEGIN { FS="\t" } $6 == name { print $7; exit }' "$cookie_jar")"
	[ -n "$cookie_value" ] || fail "Cookie $cookie_name absent du cookie jar $cookie_jar"
}

assert_equals() {
	expected="$1"
	actual="$2"
	[ "$actual" = "$expected" ] || fail "Valeur inattendue: attendu '$expected', recu '$actual'"
}

assert_not_empty() {
	value="$1"
	label="$2"
	[ -n "$value" ] || fail "Valeur vide inattendue pour $label"
}

query_scalar() {
	query="$1"

	run_database_query "$query" | tr -d '\r' | head -n 1
}

get_user_field() {
	email="$1"
	field="$2"

	query_scalar "SELECT \\\"${field}\\\" FROM \\\"User\\\" WHERE email = '${email}';"
}

get_user_field_by_username() {
	username="$1"
	field="$2"

	query_scalar "SELECT \\\"${field}\\\" FROM \\\"User\\\" WHERE username = '${username}';"
}

get_friend_request_id() {
	sender_id="$1"
	receiver_id="$2"

	query_scalar "SELECT id FROM \\\"FriendRequests\\\" WHERE \\\"senderId\\\" = ${sender_id} AND \\\"receiverId\\\" = ${receiver_id} ORDER BY id DESC LIMIT 1;"
}

get_quiz_field_by_title() {
	title="$1"
	field="$2"

	query_scalar "SELECT \\\"${field}\\\" FROM \\\"Quiz\\\" WHERE title = '${title}' ORDER BY id DESC LIMIT 1;"
}

get_room_field_by_name() {
	name="$1"
	field="$2"

	query_scalar "SELECT \\\"${field}\\\" FROM \\\"Room\\\" WHERE name = '${name}' ORDER BY \\\"createdAt\\\" DESC LIMIT 1;"
}

cleanup_user() {
	email="$1"

	run_database_query "DELETE FROM \\\"User\\\" WHERE email = '${email}';" \
		>/dev/null 2>&1 || true
}

cleanup_user_by_id() {
	user_id="$1"

	run_database_query "DELETE FROM \\\"User\\\" WHERE id = ${user_id};" \
		>/dev/null 2>&1 || true
}

cleanup_smoke_users() {
	run_database_query "DELETE FROM \\\"User\\\" WHERE email LIKE 'smoke-api-%@test.com';" \
		>/dev/null 2>&1 || true
}

CLEANUP_NEEDED=0

cleanup() {
	if [ "$CLEANUP_NEEDED" -eq 1 ]; then
		[ -n "${TEST_EMAIL:-}" ] && cleanup_user "$TEST_EMAIL"
		[ -n "${GHOST_EMAIL:-}" ] && cleanup_user "$GHOST_EMAIL"
		[ -n "${GUEST_USER_ID:-}" ] && cleanup_user_by_id "$GUEST_USER_ID"
	fi
	cleanup_smoke_users
	bash scripts/cleanup-smoke-artifacts.sh --scope=all >/dev/null 2>&1 || true

	rm -rf "$TMP_DIR"
}

trap cleanup EXIT

printf '== Smoke test ft_transcendence ==\n'
printf 'Frontend : %s\n' "$FRONTEND_BASE_URL"
printf 'Backend  : %s\n' "$BACKEND_BASE_URL"
printf 'Database : localhost:%s\n' "$POSTGRES_PORT"
print_test_catalog

section "test dev op"
detect_container_engine >/dev/null 2>&1 || fail "Ni docker ni podman n'est disponible"
check_command curl
check_command bash
[ -s "$TLS_CA_FILE" ] || fail "Certificat CA local absent: $TLS_CA_FILE. Lance 'make tls-cert'."
bash ./scripts/check-env.sh .env >/dev/null 2>&1 || fail "Configuration .env invalide. Lance 'make env-check' pour le diagnostic complet."
pass "Configuration .env valide"
compose ps >/dev/null 2>&1 || fail "Compose indisponible ou stack non accessible"
pass "Compose accessible"

check_container quiz_db
check_database_credentials
check_container quiz_backend
check_container quiz_frontend

if check_http_with_curl "${BACKEND_BASE_URL}/health" '"ok":true'; then
	:
else
	check_http_inside_container quiz_backend "https://127.0.0.1:4000/health" '"ok":true'
fi

section "test db"
check_database_query "Connexion PostgreSQL OK" "SELECT 1;" "1"
check_database_query "Table User presente" "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'User';" "1"

request_with_curl GET "${BACKEND_BASE_URL}/api"
assert_status_any 200 404
if [ "$LAST_STATUS" = "200" ]; then
	assert_body_contains '"name":"ft_transcendence"'
fi
pass "/api repond comme attendu selon l'environnement"

request_with_curl GET "${BACKEND_BASE_URL}/docs"
assert_status_any 200 404
if [ "$LAST_STATUS" = "200" ]; then
	assert_body_contains 'Swagger UI'
fi
pass "/docs repond comme attendu selon l'environnement"

section "test front end"
if check_http_with_curl "${FRONTEND_BASE_URL}" '<title>ft_transcendence</title>'; then
	:
else
	check_http_inside_container quiz_frontend "${FRONTEND_BASE_URL}" '<title>ft_transcendence</title>'
fi

if check_http_with_curl "${FRONTEND_BASE_URL}/health" '"database":{"configured":true,"ok":true}'; then
	:
else
	check_http_inside_container quiz_frontend "${FRONTEND_BASE_URL}/health" '"database":{"configured":true,"ok":true}'
fi

section "test authentication"

SMOKE_RUN_ID="$(date +%s)"
TEST_EMAIL="smoke-api-${SMOKE_RUN_ID}@test.com"
TEST_PASSWORD="longsecuredpassword123!"
TEST_USERNAME="sapia${SMOKE_RUN_ID}"
UPDATED_USERNAME="sapib${SMOKE_RUN_ID}"
PEER_EMAIL="smoke-api-peer-${SMOKE_RUN_ID}@test.com"
PEER_PASSWORD="longsecuredpassword123!"
PEER_USERNAME="sapic${SMOKE_RUN_ID}"
GHOST_EMAIL="smoke-api-ghost-${SMOKE_RUN_ID}@test.com"
GHOST_PASSWORD="longsecuredpassword123!"
GHOST_COOKIE_JAR="${TMP_DIR}/ghost-cookies.txt"
PEER_COOKIE_JAR="${TMP_DIR}/peer-cookies.txt"
GUEST_USERNAME="gsapi${SMOKE_RUN_ID}"
GUEST_COOKIE_JAR="${TMP_DIR}/guest-cookies.txt"
QUIZ_TITLE="Smoke API Quiz ${SMOKE_RUN_ID}"
UPDATED_QUIZ_TITLE="Smoke API Quiz Updated ${SMOKE_RUN_ID}"
DELETABLE_QUIZ_TITLE="Smoke API Quiz Delete ${SMOKE_RUN_ID}"
ROOM_NAME="Smoke API Room ${SMOKE_RUN_ID}"
AVATAR_DATA_URL='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+pF9sAAAAASUVORK5CYII='

REGISTER_PAYLOAD=$(printf '{"email":"%s","password":"%s","username":"%s"}' "$TEST_EMAIL" "$TEST_PASSWORD" "$TEST_USERNAME")
LOGIN_PAYLOAD=$(printf '{"email":"%s","password":"%s"}' "$TEST_EMAIL" "$TEST_PASSWORD")
INVALID_REGISTER_PAYLOAD='{"email":"not-an-email","password":"short","username":"x"}'
DUPLICATE_REGISTER_PAYLOAD="$REGISTER_PAYLOAD"
INVALID_LOGIN_PAYLOAD='{"email":"not-an-email","password":"short"}'
WRONG_PASSWORD_PAYLOAD=$(printf '{"email":"%s","password":"wrongpassword123!"}' "$TEST_EMAIL")
PEER_REGISTER_PAYLOAD=$(printf '{"email":"%s","password":"%s","username":"%s"}' "$PEER_EMAIL" "$PEER_PASSWORD" "$PEER_USERNAME")
PEER_LOGIN_PAYLOAD=$(printf '{"email":"%s","password":"%s"}' "$PEER_EMAIL" "$PEER_PASSWORD")
GHOST_REGISTER_PAYLOAD=$(printf '{"email":"%s","password":"%s","username":"sapid%s"}' "$GHOST_EMAIL" "$GHOST_PASSWORD" "$SMOKE_RUN_ID")
GHOST_LOGIN_PAYLOAD=$(printf '{"email":"%s","password":"%s"}' "$GHOST_EMAIL" "$GHOST_PASSWORD")
GUEST_LOGIN_PAYLOAD=$(printf '{"username":"%s"}' "$GUEST_USERNAME")
PROFILE_UPDATE_PAYLOAD=$(printf '{"username":"%s","status":"offline"}' "$UPDATED_USERNAME")
AVATAR_UPDATE_PAYLOAD=$(printf '{"avatarDataUrl":"%s"}' "$AVATAR_DATA_URL")
AVATAR_REMOVE_PAYLOAD='{"avatarDataUrl":null}'
QUIZ_CREATE_PAYLOAD=$(printf '{"title":"%s","questionDurationSec":10,"questions":[{"questionText":"Question smoke 1 ?","answers":["A","B","C","D"],"correctAnswerIndex":1,"points":120},{"questionText":"Question smoke 2 ?","answers":["Oui","Non"],"correctAnswerIndex":0,"points":80}]}' "$QUIZ_TITLE")
QUIZ_UPDATE_PAYLOAD=$(printf '{"title":"%s","questionDurationSec":30,"questions":[{"questionText":"Question smoke updatee ?","answers":["Rouge","Bleu","Vert"],"correctAnswerIndex":2,"points":150}]}' "$UPDATED_QUIZ_TITLE")
DELETABLE_QUIZ_PAYLOAD=$(printf '{"title":"%s","questionDurationSec":0,"questions":[{"questionText":"Question supprimable ?","answers":["Oui","Non"],"correctAnswerIndex":0,"points":50}]}' "$DELETABLE_QUIZ_TITLE")
ROOM_CREATE_PAYLOAD_TEMPLATE='{"gameType":"QUIZ","maxPlayers":4,"name":"%s","quizId":%s}'

cleanup_user "$TEST_EMAIL"
cleanup_user "$PEER_EMAIL"
cleanup_user "$GHOST_EMAIL"
cleanup_smoke_users
bash scripts/cleanup-smoke-artifacts.sh --scope=all >/dev/null 2>&1 || true
CLEANUP_NEEDED=1

request_with_curl GET "${BACKEND_BASE_URL}/auth/session" "" "$COOKIE_JAR"
assert_status 200
assert_body_contains '"success":true'
assert_body_contains '"data":null'
assert_body_contains '"error":null'
pass "Session anonyme OK sans cookie"

request_with_curl GET "${BACKEND_BASE_URL}/users/me" "" "$COOKIE_JAR"
assert_status 401
assert_body_contains '"success":false'
assert_body_contains '"code":"UNAUTHORIZED"'
assert_body_contains '"message":"Authentication required"'
pass "/users/me refuse sans cookie"

request_with_curl GET "${BACKEND_BASE_URL}/auth/session" "" "" "Cookie: access_token=invalid-token"
assert_status 200
assert_body_contains '"success":true'
assert_body_contains '"data":null'
assert_body_contains '"error":null'
pass "Session anonyme OK avec cookie invalide"

request_with_curl POST "${BACKEND_BASE_URL}/auth/register" "$INVALID_REGISTER_PAYLOAD"
assert_status 400
assert_body_contains '"success":false'
assert_body_contains '"code":"BAD_REQUEST"'
pass "Register invalide refuse"

request_with_curl POST "${BACKEND_BASE_URL}/auth/register" "$REGISTER_PAYLOAD" "$COOKIE_JAR"
assert_status 201
assert_body_contains '"success":true'
assert_body_contains "\"email\":\"${TEST_EMAIL}\""
assert_body_contains "\"username\":\"${TEST_USERNAME}\""
assert_body_contains '"status":"online"'
assert_body_not_contains '"password"'
assert_headers_contains 'Set-Cookie: access_token='
assert_cookie_jar_has_cookie "$COOKIE_JAR" "access_token"
pass "Register OK avec cookie de session"

TEST_USER_ID="$(get_user_field "$TEST_EMAIL" id)"
TEST_USER_STATUS="$(get_user_field "$TEST_EMAIL" status)"
assert_not_empty "$TEST_USER_ID" "test user id"
assert_equals "online" "$TEST_USER_STATUS"
pass "User cree en base avec status online"

request_with_curl GET "${BACKEND_BASE_URL}/auth/session" "" "$COOKIE_JAR"
assert_status 200
assert_body_contains '"success":true'
assert_body_contains "\"email\":\"${TEST_EMAIL}\""
assert_body_contains "\"id\":${TEST_USER_ID}"
assert_body_contains '"status":"online"'
assert_body_not_contains '"password"'
pass "Session courante OK juste apres register"

request_with_curl GET "${BACKEND_BASE_URL}/users/me" "" "$COOKIE_JAR"
assert_status 200
assert_body_contains '"success":true'
assert_body_contains "\"email\":\"${TEST_EMAIL}\""
assert_body_contains "\"id\":${TEST_USER_ID}"
assert_body_contains '"status":"online"'
assert_body_not_contains '"password"'
pass "/users/me OK juste apres register"

request_with_curl POST "${BACKEND_BASE_URL}/auth/logout" '{}' "$COOKIE_JAR"
assert_status_any 200 201
assert_body_contains '"loggedOut":true'
assert_headers_contains 'Set-Cookie: access_token=;'
pass "Logout OK apres register"

TEST_USER_STATUS="$(get_user_field "$TEST_EMAIL" status)"
assert_equals "offline" "$TEST_USER_STATUS"
pass "Status offline apres logout"

request_with_curl GET "${BACKEND_BASE_URL}/auth/session" "" "$COOKIE_JAR"
assert_status 200
assert_body_contains '"success":true'
assert_body_contains '"data":null'
assert_body_contains '"error":null'
pass "Session anonyme apres logout"

request_with_curl POST "${BACKEND_BASE_URL}/auth/register" "$DUPLICATE_REGISTER_PAYLOAD"
assert_status 409
assert_body_contains '"success":false'
assert_body_contains '"code":"CONFLICT"'
assert_body_contains '"message":"Cet email est déjà utilisé"'
pass "Register en doublon refuse"

request_with_curl GET "${BACKEND_BASE_URL}/auth/google/start"
assert_status 302
assert_headers_contains 'Location:'
assert_headers_contains_any 'accounts.google.com' 'oauthError=google_not_configured'
pass "Demarrage OAuth Google repond par redirection"

request_with_curl GET "${BACKEND_BASE_URL}/auth/google/callback"
assert_status 302
assert_headers_contains 'Location:'
assert_headers_contains 'oauthError=google_state_mismatch'
pass "Callback OAuth Google invalide redirige proprement"

request_with_curl POST "${BACKEND_BASE_URL}/auth/login" "$INVALID_LOGIN_PAYLOAD"
assert_status 400
assert_body_contains '"success":false'
assert_body_contains '"code":"BAD_REQUEST"'
pass "Login invalide refuse"

request_with_curl POST "${BACKEND_BASE_URL}/auth/login" "$WRONG_PASSWORD_PAYLOAD"
assert_status 401
assert_body_contains '"success":false'
assert_body_contains '"code":"UNAUTHORIZED"'
assert_body_contains '"message":"Le mail ou le mot de passe est incorrect"'
pass "Login avec mauvais mot de passe refuse"

request_with_curl POST "${BACKEND_BASE_URL}/auth/login" "$LOGIN_PAYLOAD" "$COOKIE_JAR"
assert_status_any 200 201
assert_body_contains '"success":true'
assert_body_contains "\"email\":\"${TEST_EMAIL}\""
assert_body_contains "\"username\":\"${TEST_USERNAME}\""
assert_body_contains '"status":"online"'
assert_body_not_contains '"password"'
assert_headers_contains 'Set-Cookie: access_token='
assert_cookie_jar_has_cookie "$COOKIE_JAR" "access_token"
pass "Login OK"

TEST_USER_STATUS="$(get_user_field "$TEST_EMAIL" status)"
assert_equals "online" "$TEST_USER_STATUS"
pass "Status online apres login"

request_with_curl GET "${BACKEND_BASE_URL}/auth/session" "" "$COOKIE_JAR"
assert_status 200
assert_body_contains '"success":true'
assert_body_contains "\"email\":\"${TEST_EMAIL}\""
assert_body_contains "\"id\":${TEST_USER_ID}"
assert_body_contains '"status":"online"'
assert_body_not_contains '"password"'
pass "Session courante OK"

request_with_curl GET "${BACKEND_BASE_URL}/users/me" "" "$COOKIE_JAR"
assert_status 200
assert_body_contains '"success":true'
assert_body_contains "\"email\":\"${TEST_EMAIL}\""
assert_body_contains "\"id\":${TEST_USER_ID}"
assert_body_contains '"status":"online"'
assert_body_not_contains '"password"'
pass "/users/me OK"

request_with_curl GET "${BACKEND_BASE_URL}/users/${TEST_USER_ID}"
assert_status 200
assert_body_contains '"success":true'
assert_body_contains "\"email\":\"${TEST_EMAIL}\""
assert_body_contains "\"id\":${TEST_USER_ID}"
pass "/users/:id OK"

request_with_curl PATCH "${BACKEND_BASE_URL}/users/me/avatar" "$AVATAR_UPDATE_PAYLOAD" "$COOKIE_JAR"
assert_status 200
assert_body_contains '"success":true'
assert_body_contains '"avatar_url":"data:image/png;base64,'
pass "Mise a jour avatar OK"

request_with_curl PATCH "${BACKEND_BASE_URL}/users/me/avatar" "$AVATAR_REMOVE_PAYLOAD" "$COOKIE_JAR"
assert_status 200
assert_body_contains '"success":true'
assert_body_contains '"avatar_url":null'
pass "Suppression avatar OK"

request_with_curl PATCH "${BACKEND_BASE_URL}/users/me/profile" "$PROFILE_UPDATE_PAYLOAD" "$COOKIE_JAR"
assert_status 200
assert_body_contains '"success":true'
assert_body_contains "\"username\":\"${UPDATED_USERNAME}\""
assert_body_contains '"status":"offline"'
pass "Mise a jour profil OK"

request_with_curl GET "${BACKEND_BASE_URL}/auth/session" "" "$COOKIE_JAR"
assert_status 200
assert_body_contains "\"username\":\"${UPDATED_USERNAME}\""
assert_body_contains '"status":"offline"'
pass "Session mise a jour apres modification profil"

request_with_curl POST "${BACKEND_BASE_URL}/auth/register" "$PEER_REGISTER_PAYLOAD" "$PEER_COOKIE_JAR"
assert_status 201
assert_body_contains "\"email\":\"${PEER_EMAIL}\""
assert_body_contains "\"username\":\"${PEER_USERNAME}\""
pass "Creation utilisateur pair OK"

PEER_USER_ID="$(get_user_field "$PEER_EMAIL" id)"
assert_not_empty "$PEER_USER_ID" "peer user id"

section "test users"

request_with_curl GET "${BACKEND_BASE_URL}/users/me/friends" "" "$COOKIE_JAR"
assert_status 200
assert_body_contains '"success":true'
assert_body_contains '"friends":[]'
pass "Vue amis vide au depart"

request_with_curl GET "${BACKEND_BASE_URL}/users/me/friends/messages/${PEER_USER_ID}" "" "$COOKIE_JAR"
assert_status 403
assert_body_contains '"success":false'
assert_body_contains '"code":"FORBIDDEN"'
pass "Messagerie privee refusee avant amitie"

request_with_curl POST "${BACKEND_BASE_URL}/users/me/friends" "$(printf '{"username":"%s"}' "$PEER_USERNAME")" "$COOKIE_JAR"
assert_status 201
assert_body_contains '"success":true'
assert_body_contains '"friendshipStatus":"pending"'
pass "Demande d'ami envoyee"

FRIEND_REQUEST_ID="$(get_friend_request_id "$TEST_USER_ID" "$PEER_USER_ID")"
assert_not_empty "$FRIEND_REQUEST_ID" "friend request id"

request_with_curl GET "${BACKEND_BASE_URL}/users/me/friends" "" "$PEER_COOKIE_JAR"
assert_status 200
assert_body_contains "\"id\":${FRIEND_REQUEST_ID}"
assert_body_contains "\"username\":\"${UPDATED_USERNAME}\""
pass "Reception demande d'ami visible"

request_with_curl PATCH "${BACKEND_BASE_URL}/users/me/friends/requests/${FRIEND_REQUEST_ID}" '{"action":"accepted"}' "$PEER_COOKIE_JAR"
assert_status 200
assert_body_contains '"success":true'
assert_body_contains '"friendshipStatus":"accepted"'
pass "Acceptation demande d'ami OK"

request_with_curl GET "${BACKEND_BASE_URL}/users/me/friends" "" "$COOKIE_JAR"
assert_status 200
assert_body_contains "\"id\":${PEER_USER_ID}"
assert_body_contains "\"username\":\"${PEER_USERNAME}\""
pass "Ami visible dans le reseau du user principal"

request_with_curl GET "${BACKEND_BASE_URL}/users/me/friends/conversations" "" "$COOKIE_JAR"
assert_status 200
assert_body_contains '"success":true'
assert_body_contains '"data":[]'
pass "Liste de conversations vide avant message"

request_with_curl POST "${BACKEND_BASE_URL}/users/me/friends/messages/${PEER_USER_ID}" '{"content":"Salut smoke peer"}' "$COOKIE_JAR"
assert_status 201
assert_body_contains '"success":true'
assert_body_contains '"content":"Salut smoke peer"'
pass "Envoi message prive OK"

request_with_curl GET "${BACKEND_BASE_URL}/users/me/friends/conversations" "" "$PEER_COOKIE_JAR"
assert_status 200
assert_body_contains "\"friendId\":${TEST_USER_ID}"
assert_body_contains '"unreadCount":1'
pass "Resume conversations indique un message non lu"

request_with_curl GET "${BACKEND_BASE_URL}/users/me/friends/messages/${TEST_USER_ID}" "" "$PEER_COOKIE_JAR"
assert_status 200
assert_body_contains '"success":true'
assert_body_contains '"content":"Salut smoke peer"'
assert_body_contains "\"senderId\":${TEST_USER_ID}"
pass "Lecture conversation privee OK"

request_with_curl GET "${BACKEND_BASE_URL}/users/me/friends/conversations" "" "$PEER_COOKIE_JAR"
assert_status 200
assert_body_contains "\"friendId\":${TEST_USER_ID}"
assert_body_contains '"unreadCount":0'
pass "Lecture conversation remet le compteur a zero"

request_with_curl DELETE "${BACKEND_BASE_URL}/users/me/friends/${PEER_USER_ID}" "" "$COOKIE_JAR"
assert_status 200
assert_body_contains '"success":true'
assert_body_contains 'retir'
pass "Suppression ami OK"

request_with_curl GET "${BACKEND_BASE_URL}/users/me/friends/conversations" "" "$COOKIE_JAR"
assert_status 200
assert_body_contains '"data":[]'
pass "Conversations vides apres suppression ami"

section "test quizzes"

request_with_curl GET "${BACKEND_BASE_URL}/quizzes"
assert_status 200
assert_body_contains '"success":true'
pass "Liste quizzes accessible"

request_with_curl GET "${BACKEND_BASE_URL}/quizzes/me" "" "$COOKIE_JAR"
assert_status 200
assert_body_contains '"success":true'
pass "Liste de mes quizzes accessible"

request_with_curl POST "${BACKEND_BASE_URL}/quizzes" "$QUIZ_CREATE_PAYLOAD" "$COOKIE_JAR"
assert_status 201
assert_body_contains '"success":true'
assert_body_contains "\"title\":\"${QUIZ_TITLE}\""
assert_body_contains '"questionDurationSec":10'
pass "Creation quiz OK"

QUIZ_ID="$(get_quiz_field_by_title "$QUIZ_TITLE" id)"
assert_not_empty "$QUIZ_ID" "quiz id"

request_with_curl GET "${BACKEND_BASE_URL}/quizzes/me" "" "$COOKIE_JAR"
assert_status 200
assert_body_contains "\"title\":\"${QUIZ_TITLE}\""
pass "Le quiz cree apparait dans /quizzes/me"

request_with_curl GET "${BACKEND_BASE_URL}/quizzes/${QUIZ_ID}"
assert_status 200
assert_body_contains "\"id\":${QUIZ_ID}"
assert_body_contains "\"title\":\"${QUIZ_TITLE}\""
pass "Recuperation quiz par id OK"

request_with_curl PATCH "${BACKEND_BASE_URL}/quizzes/${QUIZ_ID}" "$QUIZ_UPDATE_PAYLOAD" "$COOKIE_JAR"
assert_status 200
assert_body_contains "\"title\":\"${UPDATED_QUIZ_TITLE}\""
assert_body_contains '"questionDurationSec":30'
pass "Mise a jour quiz OK"

request_with_curl GET "${BACKEND_BASE_URL}/quizzes"
assert_status 200
assert_body_contains "\"title\":\"${UPDATED_QUIZ_TITLE}\""
pass "Le quiz mis a jour apparait dans la liste globale"

request_with_curl POST "${BACKEND_BASE_URL}/quizzes" "$DELETABLE_QUIZ_PAYLOAD" "$COOKIE_JAR"
assert_status 201
assert_body_contains "\"title\":\"${DELETABLE_QUIZ_TITLE}\""
pass "Creation quiz supprimable OK"

DELETABLE_QUIZ_ID="$(get_quiz_field_by_title "$DELETABLE_QUIZ_TITLE" id)"
assert_not_empty "$DELETABLE_QUIZ_ID" "deletable quiz id"

request_with_curl DELETE "${BACKEND_BASE_URL}/quizzes/${DELETABLE_QUIZ_ID}" "" "$COOKIE_JAR"
assert_status 200
assert_body_contains '"success":true'
pass "Suppression quiz OK sur un quiz non utilise"

request_with_curl GET "${BACKEND_BASE_URL}/quizzes/${DELETABLE_QUIZ_ID}"
assert_status 404
assert_body_contains '"success":false'
assert_body_contains '"code":"NOT_FOUND"'
pass "Le quiz supprime n'est plus recuperable"

section "test scores"

request_with_curl GET "${BACKEND_BASE_URL}/scores/leaderboard?limit=5"
assert_status 200
assert_body_contains '"success":true'
pass "Leaderboard global accessible"

request_with_curl GET "${BACKEND_BASE_URL}/scores/leaderboard/wins?limit=5"
assert_status 200
assert_body_contains '"success":true'
pass "Leaderboard des wins accessible"

request_with_curl GET "${BACKEND_BASE_URL}/scores/users/${TEST_USER_ID}/wins-rank"
assert_status 200
assert_body_contains '"success":true'
assert_body_contains "\"userId\":${TEST_USER_ID}"
assert_body_contains '"totalWins":0'
pass "Rang wins utilisateur accessible"

request_with_curl GET "${BACKEND_BASE_URL}/scores/users/${TEST_USER_ID}"
assert_status 404
assert_body_contains '"success":false'
assert_body_contains '"code":"NOT_FOUND"'
pass "Score global absent renvoie bien 404"

request_with_curl GET "${BACKEND_BASE_URL}/scores/quizzes/${QUIZ_ID}/leaderboard?limit=5"
assert_status 200
assert_body_contains '"success":true'
pass "Leaderboard par quiz accessible"

section "test rooms"

request_with_curl GET "${BACKEND_BASE_URL}/rooms" "" "$COOKIE_JAR"
assert_status 200
assert_body_contains '"success":true'
pass "Liste rooms accessible"

ROOM_CREATE_PAYLOAD=$(printf "$ROOM_CREATE_PAYLOAD_TEMPLATE" "$ROOM_NAME" "$QUIZ_ID")
request_with_curl POST "${BACKEND_BASE_URL}/rooms" "$ROOM_CREATE_PAYLOAD" "$COOKIE_JAR"
assert_status 201
assert_body_contains '"success":true'
assert_body_contains "\"name\":\"${ROOM_NAME}\""
assert_body_contains "\"quizId\":${QUIZ_ID}"
assert_body_contains '"status":"WAITING"'
pass "Creation room OK"

ROOM_ID="$(get_room_field_by_name "$ROOM_NAME" id)"
assert_not_empty "$ROOM_ID" "room id"

request_with_curl GET "${BACKEND_BASE_URL}/rooms" "" "$COOKIE_JAR"
assert_status 200
assert_body_contains "\"id\":\"${ROOM_ID}\""
assert_body_contains "\"name\":\"${ROOM_NAME}\""
pass "La room creee apparait dans la liste"

request_with_curl DELETE "${BACKEND_BASE_URL}/quizzes/${QUIZ_ID}" "" "$COOKIE_JAR"
assert_status 400
assert_body_contains '"success":false'
assert_body_contains '"code":"BAD_REQUEST"'
pass "Suppression quiz refusee tant qu'une room l'utilise"

section "test cleanup via api"

request_with_curl POST "${BACKEND_BASE_URL}/auth/login" "$PEER_LOGIN_PAYLOAD" "$PEER_COOKIE_JAR"
assert_status_any 200 201
pass "Relogin pair OK"

request_with_curl POST "${BACKEND_BASE_URL}/auth/logout" '{}' "$PEER_COOKIE_JAR"
assert_status_any 200 201
assert_body_contains '"loggedOut":true'
pass "Logout pair OK"

request_with_curl POST "${BACKEND_BASE_URL}/auth/logout" '{}' "$COOKIE_JAR"
assert_status_any 200 201
assert_body_contains '"loggedOut":true'
assert_headers_contains 'Set-Cookie: access_token=;'
pass "Logout OK apres login"

TEST_USER_STATUS="$(get_user_field "$TEST_EMAIL" status)"
assert_equals "offline" "$TEST_USER_STATUS"
pass "Status offline apres logout final"

request_with_curl GET "${BACKEND_BASE_URL}/auth/session" "" "$COOKIE_JAR"
assert_status 200
assert_body_contains '"success":true'
assert_body_contains '"data":null'
assert_body_contains '"error":null'
pass "Session anonyme apres logout final"

request_with_curl POST "${BACKEND_BASE_URL}/auth/register" "$GHOST_REGISTER_PAYLOAD"
assert_status 201
pass "Ghost register OK"

request_with_curl POST "${BACKEND_BASE_URL}/auth/login" "$GHOST_LOGIN_PAYLOAD" "$GHOST_COOKIE_JAR"
assert_status_any 200 201
pass "Ghost login OK"

GHOST_USER_ID="$(get_user_field "$GHOST_EMAIL" id)"
assert_not_empty "$GHOST_USER_ID" "ghost user id"
cleanup_user "$GHOST_EMAIL"

request_with_curl GET "${BACKEND_BASE_URL}/auth/session" "" "$GHOST_COOKIE_JAR"
assert_status 200
assert_body_contains '"success":true'
assert_body_contains '"data":null'
assert_body_contains '"error":null'
pass "Session anonyme si le user du token n'existe plus"

request_with_curl POST "${BACKEND_BASE_URL}/auth/guest" "$GUEST_LOGIN_PAYLOAD" "$GUEST_COOKIE_JAR"
assert_status_any 200 201
assert_body_contains '"success":true'
assert_body_contains "\"username\":\"${GUEST_USERNAME}\""
assert_body_contains '"isGuest":true'
assert_body_contains '"status":"online"'
assert_headers_contains 'Set-Cookie: access_token='
assert_cookie_jar_has_cookie "$GUEST_COOKIE_JAR" "access_token"
pass "Connexion invite OK"

GUEST_USER_ID="$(get_user_field_by_username "$GUEST_USERNAME" id)"
GUEST_USER_STATUS="$(get_user_field_by_username "$GUEST_USERNAME" status)"
GUEST_IS_GUEST="$(get_user_field_by_username "$GUEST_USERNAME" isGuest)"
assert_not_empty "$GUEST_USER_ID" "guest user id"
assert_equals "online" "$GUEST_USER_STATUS"
assert_equals "t" "$GUEST_IS_GUEST"
pass "Guest cree en base avec status online"

request_with_curl GET "${BACKEND_BASE_URL}/auth/session" "" "$GUEST_COOKIE_JAR"
assert_status 200
assert_body_contains '"success":true'
assert_body_contains "\"id\":${GUEST_USER_ID}"
assert_body_contains "\"username\":\"${GUEST_USERNAME}\""
assert_body_contains '"isGuest":true'
pass "Session invite OK"

request_with_curl POST "${BACKEND_BASE_URL}/auth/logout" '{}' "$GUEST_COOKIE_JAR"
assert_status_any 200 201
assert_body_contains '"loggedOut":true'
pass "Logout invite OK"

request_with_curl GET "${BACKEND_BASE_URL}/auth/session" "" "$GUEST_COOKIE_JAR"
assert_status 200
assert_body_contains '"success":true'
assert_body_contains '"data":null'
assert_body_contains '"error":null'
pass "Session invite anonyme apres logout"

request_with_curl DELETE "${BACKEND_BASE_URL}/quizzes/${QUIZ_ID}" "" "$COOKIE_JAR"
assert_status 401
assert_body_contains '"success":false'
assert_body_contains '"code":"UNAUTHORIZED"'
pass "Le quiz reste protege par AuthGuard apres logout"

pass "Smoke test termine avec succes"
