#!/bin/sh
# Each run owns exactly one local database; never delete unrelated fixtures.
set -eu
TEST_DB_NAME="sohum_ats_test_$(date +%s)_$$"
DB="postgres://$(whoami)@localhost:5432/$TEST_DB_NAME"
cleanup() { psql -h localhost -d postgres -c "DROP DATABASE IF EXISTS \"$TEST_DB_NAME\" WITH (FORCE)" >/dev/null 2>&1 || true; }
trap cleanup EXIT HUP INT TERM
ATS_TEST_DATABASE_URL="$DB" node scripts/setup-ats-test-db.mjs
ATS_TEST_DATABASE_URL="$DB" npx vitest run tests/ats-integration.test.ts tests/e2e-funnel.test.ts tests/invoices-integration.test.ts "$@"
