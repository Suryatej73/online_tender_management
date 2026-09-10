#!/bin/bash
# tenderX Quick Start Script

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

echo "=========================================="
echo " Starting tenderX Infrastructure..."
echo "=========================================="

# Start Django Backend on port 8000
echo "Starting Backend on http://localhost:8000 ..."
cd "$DIR/backend" && USE_SQLITE=True python3 manage.py migrate --noinput && USE_SQLITE=True python3 manage.py runserver 0.0.0.0:8000 &
BACKEND_PID=$!

# Wait 2 seconds for backend to initialize
sleep 2

# Start Vite Frontend on port 5173
echo "Starting Frontend on http://localhost:5173 ..."
cd "$DIR/frontend" && npm run dev &
FRONTEND_PID=$!

echo ""
echo "=========================================="
echo " tenderX is LIVE!"
echo " Frontend: http://localhost:5173"
echo " Backend:  http://localhost:8000"
echo "=========================================="
echo "Press Ctrl+C to stop both servers."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT INT TERM
wait
