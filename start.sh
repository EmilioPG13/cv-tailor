#!/usr/bin/env bash
DIR="$( cd "$(dirname "$0")" && pwd )"

echo "Starting CV Tailor..."
echo "  Backend  → http://localhost:3001"
echo "  Frontend → http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop both servers."
echo ""

(cd "$DIR/server" && npm run dev) &
SERVER_PID=$!

(cd "$DIR/client" && npm run dev) &
CLIENT_PID=$!

trap "kill $SERVER_PID $CLIENT_PID 2>/dev/null; exit 0" INT TERM
wait
