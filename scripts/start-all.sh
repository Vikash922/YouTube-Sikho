#!/usr/bin/env bash
# ==============================================================================
# YOUTUBE SIKHO - UNIFIED DUAL SERVER LAUNCHER & MONITOR (ADMIN + EXPO)
# ==============================================================================

ROOT_DIR="/root/course-app"
ADMIN_DIR="$ROOT_DIR/admin"

GATEWAY_DIR="$ROOT_DIR/gateway"

check_http() {
  local url="$1"
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 2 "$url" 2>/dev/null)
  if [ "$code" = "200" ]; then
    return 0
  else
    return 1
  fi
}

echo "═════════════════════════════════════════════════════════════════"
echo "        STATUS & LAUNCHER: ADMIN PANEL (:5173) + EXPO (:8081)    "
echo "═════════════════════════════════════════════════════════════════"

# 1. Admin Panel Check & Start
if check_http "http://127.0.0.1:5173/"; then
  echo "✓ [RUNNING] Admin Panel is responding at http://localhost:5173"
else
  echo "▶ [STARTING] Admin Panel on port 5173..."
  cd "$ADMIN_DIR" && nohup npm run dev > /tmp/admin-vite.log 2>&1 &
  sleep 2
  if check_http "http://127.0.0.1:5173/"; then
    echo "✓ [STARTED] Admin Panel is up at http://localhost:5173"
  else
    echo "ℹ [STARTING] Admin Panel is initializing. Check /tmp/admin-vite.log"
  fi
fi

# 2. Expo Metro Bundler Check & Start
if check_http "http://127.0.0.1:8081/"; then
  echo "✓ [RUNNING] Expo Metro Bundler is responding at exp://127.0.0.1:8081"
else
  echo "▶ [STARTING] Expo Metro Bundler on port 8081..."
  cd "$ROOT_DIR" && EXPO_OFFLINE=1 CI=1 nohup npx expo start --host lan --port 8081 < /dev/null > /tmp/expo-metro.log 2>&1 &
  sleep 4
  if check_http "http://127.0.0.1:8081/"; then
    echo "✓ [STARTED] Expo Metro Bundler is up at exp://127.0.0.1:8081"
  else
    echo "ℹ [STARTING] Expo Metro is initializing. Check /tmp/expo-metro.log"
  fi
fi

# 3. YouPI PG Payment Gateway Check & Start (Merchant Hub :6001, Portal :7000, API :6100)
if check_http "http://127.0.0.1:6001/"; then
  echo "✓ [RUNNING] YouPI Merchant Hub is responding at http://localhost:6001"
else
  echo "▶ [STARTING] YouPI Payment Gateway (:6001, :7000, :6100)..."
  cd "$GATEWAY_DIR" && YOUPI_ALLOW_LOCALHOST_MODE=true YOUPI_MODE=localhost nohup node scripts/start.js > /tmp/youpi-gateway.log 2>&1 &
  sleep 3
  if check_http "http://127.0.0.1:6001/"; then
    echo "✓ [STARTED] YouPI Merchant Hub is up at http://localhost:6001"
  else
    echo "ℹ [STARTING] YouPI Gateway is initializing. Check /tmp/youpi-gateway.log"
  fi
fi

# 4. Termux / PRoot Keep-Alive Background Loop
if ! pgrep -f "keep-alive-servers" >/dev/null 2>&1; then
  (
    exec -a keep-alive-servers bash -c '
      while true; do
        kill -CONT $(pgrep -f "vite|expo|node") 2>/dev/null
        sleep 5
      done
    '
  ) &
fi

echo ""
echo "═════════════════════════════════════════════════════════════════"
echo "🎉 ALL SYSTEMS READY:"
echo "  1. Admin Panel & Web Checkout: http://localhost:5173"
echo "  2. YouPI Merchant Console:    http://localhost:6001"
echo "  3. Mobile App (Expo Go):       exp://127.0.0.1:8081"
echo "═════════════════════════════════════════════════════════════════"
