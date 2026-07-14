#!/usr/bin/env bash
# Validation complète du projet — miroir des jobs CI (.github/workflows/develop.yml).
# Lance tout, n'échoue pas au premier raté, et termine par un récapitulatif.
# Usage : ./scripts/verify.sh
set -u
cd "$(dirname "$0")/.."

declare -a names=() results=()

run() {
    local name="$1"
    shift
    echo ""
    echo "═══ ${name} : $* ═══"
    if "$@"; then
        results+=("OK")
    else
        results+=("ÉCHEC")
    fi
    names+=("${name}")
}

run "typecheck   " npx tsc --noEmit
run "lint        " npm run lint:check
# coverage exécute les suites jsdom + browser puis merge avec les seuils (IMP-013) :
# ne pas relancer `npm test` / `test:components` en plus, ce serait une double exécution.
run "coverage    " env NODE_ENV=test npm run coverage
run "e2e         " npm run test:e2e
run "build       " npm run build
run "audit       " npm audit
run "docs        " npm run docs:build

echo ""
echo "═══════════ Récapitulatif ═══════════"
failed=0
for i in "${!names[@]}"; do
    echo "  ${names[$i]} ${results[$i]}"
    [ "${results[$i]}" = "ÉCHEC" ] && failed=1
done
if [ "$failed" -ne 0 ]; then
    echo "✗ Validation en échec."
    exit 1
fi
echo "✓ Tout est vert."
