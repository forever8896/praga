#!/usr/bin/env bash
# Register pragueconnect.eth on Ethereum mainnet via ENS commit-reveal,
# deploy PragueConnectResolver to mainnet, and point the parent name at it.
#
# Required env:
#   DEPLOYER_KEY            private key of the registering EOA (mainnet ETH funded)
#   ETH_MAINNET_RPC         JSON-RPC URL for mainnet (e.g. Alchemy/Infura)
#   RESOLVER_GATEWAY_URL    https://pragueconnect-azure.vercel.app/api/ccip/{sender}/{data}.json
#   RESOLVER_SIGNER         address whose private key signs CCIP-Read responses
#                           (currently $PC_RESOLVER_SIGNER_KEY's address — same one used on Sepolia)
#
# Optional env:
#   ENS_NAME                label without .eth (default: pragueconnect)
#   DURATION_SECONDS        default 31536000 (1 year)
#   ENS_CONTROLLER          override the ENS registrar controller address
#                           (default: 0x253553366Da8546fC250F225fe3d25d0C782303b — v3 controller)
#   PRAGUECONNECT_MAINNET_RESOLVER
#                           if set, skip resolver deployment and use this address
#
# Flags:
#   --dry-run               print every step but don't broadcast
#   --yes                   skip the interactive confirmation
#
# This script is idempotent within a session: if resolver deploy succeeded
# but commit failed, re-running will detect the resolver and skip its deploy.
# It cannot resume across sessions (commitment salt is regenerated) — if a
# commit was sent and the script died before register, run with the
# COMMITMENT_SECRET env var matching the original to re-use it.

set -euo pipefail

# --- Defaults ---
ENS_NAME="${ENS_NAME:-pragueconnect}"
DURATION_SECONDS="${DURATION_SECONDS:-31536000}"
ENS_CONTROLLER="${ENS_CONTROLLER:-0x253553366Da8546fC250F225fe3d25d0C782303b}"
ENS_REGISTRY="0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e"

DRY_RUN="false"
SKIP_CONFIRM="false"
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN="true" ;;
    --yes) SKIP_CONFIRM="true" ;;
    *) echo "unknown flag: $arg"; exit 2 ;;
  esac
done

bcast() {
  if [[ "$DRY_RUN" == "true" ]]; then
    echo "  [dry-run] $*"
  else
    "$@"
  fi
}

# --- Validate env ---
: "${DEPLOYER_KEY:?DEPLOYER_KEY not set}"
: "${ETH_MAINNET_RPC:?ETH_MAINNET_RPC not set}"
: "${RESOLVER_GATEWAY_URL:?RESOLVER_GATEWAY_URL not set}"
: "${RESOLVER_SIGNER:?RESOLVER_SIGNER not set (address that signs CCIP responses)}"

DEPLOYER_ADDR=$(cast wallet address "$DEPLOYER_KEY")

# --- Pre-flight ---
echo "──────────────────────────────────────────────────────────"
echo "  PragueConnect mainnet ENS registration"
echo "──────────────────────────────────────────────────────────"
echo "  name:        ${ENS_NAME}.eth"
echo "  duration:    ${DURATION_SECONDS} seconds (~$((DURATION_SECONDS / 86400)) days)"
echo "  deployer:    ${DEPLOYER_ADDR}"
echo "  controller:  ${ENS_CONTROLLER}"
echo "  registry:    ${ENS_REGISTRY}"
echo "  signer:      ${RESOLVER_SIGNER}"
echo "  gateway:     ${RESOLVER_GATEWAY_URL}"
echo "  dry-run:     ${DRY_RUN}"
echo

echo "→ checking deployer balance…"
BALANCE_WEI=$(cast balance "$DEPLOYER_ADDR" --rpc-url "$ETH_MAINNET_RPC")
BALANCE_ETH=$(cast to-unit "$BALANCE_WEI" ether)
echo "  balance: ${BALANCE_ETH} ETH"
if (( $(echo "$BALANCE_ETH < 0.015" | bc -l) )); then
  echo "  ⚠  recommend ≥ 0.015 ETH. continuing anyway…"
fi
echo

echo "→ checking name availability…"
AVAILABLE_HEX=$(cast call "$ENS_CONTROLLER" "available(string)(bool)" "$ENS_NAME" --rpc-url "$ETH_MAINNET_RPC")
echo "  available: $AVAILABLE_HEX"
if [[ "$AVAILABLE_HEX" != "true" ]]; then
  echo "  ✗ ${ENS_NAME}.eth is not available. Aborting."
  exit 1
fi
echo

echo "→ fetching rent price…"
PRICE_RAW=$(cast call "$ENS_CONTROLLER" "rentPrice(string,uint256)((uint256,uint256))" "$ENS_NAME" "$DURATION_SECONDS" --rpc-url "$ETH_MAINNET_RPC")
# Returns a tuple "(base, premium)" — strip the parens
PRICE_INNER=$(echo "$PRICE_RAW" | tr -d '()' | tr ',' ' ')
BASE_PRICE=$(echo "$PRICE_INNER" | awk '{print $1}')
PREMIUM_PRICE=$(echo "$PRICE_INNER" | awk '{print $2}')
TOTAL_PRICE=$(echo "$BASE_PRICE + $PREMIUM_PRICE" | bc)
TOTAL_PRICE_ETH=$(cast to-unit "$TOTAL_PRICE" ether)
echo "  base premium total"
echo "  ${BASE_PRICE} ${PREMIUM_PRICE} ${TOTAL_PRICE} wei (${TOTAL_PRICE_ETH} ETH)"
# Add 10% buffer for value sent to register (refunded if not needed)
REG_VALUE=$(echo "$TOTAL_PRICE * 110 / 100" | bc)
echo "  sending: ${REG_VALUE} wei (10% buffer; remainder refunded)"
echo

# --- Confirm ---
if [[ "$SKIP_CONFIRM" != "true" && "$DRY_RUN" != "true" ]]; then
  read -r -p "Proceed? Type 'yes' to continue: " CONFIRM
  if [[ "$CONFIRM" != "yes" ]]; then
    echo "Aborted."
    exit 0
  fi
fi

# --- 1. Deploy resolver ---
RESOLVER="${PRAGUECONNECT_MAINNET_RESOLVER:-}"
if [[ -z "$RESOLVER" ]]; then
  echo "→ deploying PragueConnectResolver on mainnet…"
  cd "$(dirname "$0")/.."
  if [[ "$DRY_RUN" == "true" ]]; then
    echo "  [dry-run] forge create … PragueConnectResolver(\"${RESOLVER_GATEWAY_URL}\", [${RESOLVER_SIGNER}])"
    RESOLVER="0x0000000000000000000000000000000000000000"
  else
    DEPLOY_OUT=$(forge create src/PragueConnectResolver.sol:PragueConnectResolver \
      --rpc-url "$ETH_MAINNET_RPC" \
      --private-key "$DEPLOYER_KEY" \
      --broadcast \
      --constructor-args "$RESOLVER_GATEWAY_URL" "[$RESOLVER_SIGNER]")
    RESOLVER=$(echo "$DEPLOY_OUT" | grep -oE 'Deployed to: 0x[a-fA-F0-9]{40}' | awk '{print $3}')
    if [[ -z "$RESOLVER" ]]; then
      echo "  ✗ resolver deploy failed. Output: $DEPLOY_OUT"
      exit 1
    fi
  fi
  echo "  resolver: $RESOLVER"
  cd - > /dev/null
else
  echo "→ reusing existing resolver: $RESOLVER"
fi
echo

# --- 2. Make commitment ---
SECRET="${COMMITMENT_SECRET:-$(cast wallet new | grep -oE '0x[a-fA-F0-9]{64}' | head -1)}"
echo "→ commitment secret: $SECRET"
echo "  (save this — needed to retry register if commit succeeds but register fails)"
echo

REVERSE_RECORD="false"
OWNER_FUSES=0

# Empty data array — we'll set the resolver via the register call's resolver arg
DATA_ARRAY="[]"

echo "→ computing commitment hash…"
COMMITMENT=$(cast call "$ENS_CONTROLLER" \
  "makeCommitment(string,address,uint256,bytes32,address,bytes[],bool,uint16)(bytes32)" \
  "$ENS_NAME" "$DEPLOYER_ADDR" "$DURATION_SECONDS" "$SECRET" "$RESOLVER" "$DATA_ARRAY" "$REVERSE_RECORD" "$OWNER_FUSES" \
  --rpc-url "$ETH_MAINNET_RPC")
echo "  commitment: $COMMITMENT"
echo

echo "→ submitting commit() …"
bcast cast send "$ENS_CONTROLLER" \
  "commit(bytes32)" "$COMMITMENT" \
  --rpc-url "$ETH_MAINNET_RPC" \
  --private-key "$DEPLOYER_KEY"
echo

# --- 3. Wait for the commit-reveal age (60s default + safety margin) ---
WAIT_SECONDS=70
if [[ "$DRY_RUN" == "true" ]]; then
  echo "→ [dry-run] would wait ${WAIT_SECONDS} seconds…"
else
  echo "→ waiting ${WAIT_SECONDS} seconds for commit-reveal age…"
  for i in $(seq "$WAIT_SECONDS" -1 1); do
    printf "\r  %2ds remaining " "$i"
    sleep 1
  done
  printf "\r              \n"
fi
echo

# --- 4. Register ---
echo "→ submitting register() with ${REG_VALUE} wei…"
bcast cast send "$ENS_CONTROLLER" \
  "register(string,address,uint256,bytes32,address,bytes[],bool,uint16)" \
  "$ENS_NAME" "$DEPLOYER_ADDR" "$DURATION_SECONDS" "$SECRET" "$RESOLVER" "$DATA_ARRAY" "$REVERSE_RECORD" "$OWNER_FUSES" \
  --value "$REG_VALUE" \
  --rpc-url "$ETH_MAINNET_RPC" \
  --private-key "$DEPLOYER_KEY"
echo

# --- 5. Verify ---
if [[ "$DRY_RUN" != "true" ]]; then
  echo "→ verifying resolver is set on the registry…"
  NODE=$(cast namehash "${ENS_NAME}.eth")
  ACTUAL_RESOLVER=$(cast call "$ENS_REGISTRY" "resolver(bytes32)(address)" "$NODE" --rpc-url "$ETH_MAINNET_RPC")
  echo "  registry resolver for ${ENS_NAME}.eth: $ACTUAL_RESOLVER"
  if [[ "${ACTUAL_RESOLVER,,}" == "${RESOLVER,,}" ]]; then
    echo "  ✓ resolver matches"
  else
    echo "  ⚠ resolver does not match — register may not have set it. Run cast send 'setResolver(bytes32,address)' on the registry."
  fi
fi

echo
echo "──────────────────────────────────────────────────────────"
echo "  Done."
echo
echo "  Set this in your Vercel production environment:"
echo "  NEXT_PUBLIC_NAMESTONE_DOMAIN=${ENS_NAME}.eth"
echo "  PRAGUECONNECT_MAINNET_RESOLVER=${RESOLVER}"
echo
echo "  Verify resolution:"
echo "  cast call ${RESOLVER} 'url()(string)' --rpc-url \$ETH_MAINNET_RPC"
echo "  curl -sI https://kilian.${ENS_NAME}.eth.limo  # after a profile is published"
echo "──────────────────────────────────────────────────────────"
