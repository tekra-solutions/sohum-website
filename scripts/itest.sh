#!/bin/sh
# Drop any prior fixtures, seed a fresh one, run the integration suite.
psql -h localhost -d postgres -tAc "select datname from pg_database where datname like 'sohum_ats_test_%'" \
  | while read d; do [ -n "$d" ] && psql -h localhost -d postgres -c "DROP DATABASE $d;" >/dev/null 2>&1; done
DB="postgres://$(whoami)@localhost:5432/sohum_ats_test_$(date +%s)"
ATS_TEST_DATABASE_URL="$DB" node scripts/setup-ats-test-db.mjs >/dev/null 2>&1 || { echo "fixture setup failed"; exit 1; }
ATS_TEST_DATABASE_URL="$DB" npx vitest run tests/ats-integration.test.ts tests/e2e-funnel.test.ts "$@"
