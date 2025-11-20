#!/bin/bash
# test-multiple-clients.sh
# Usage: ./test-multiple-clients.sh 5
HOST=${1}
NUM_CLIENTS=${2:-5}
PIDS=()

echo "Opening $NUM_CLIENTS SSE clients..."

# Start clients and track PIDs
for i in $(seq 1 $NUM_CLIENTS); do
    echo "Starting client $i..."
    curl -N -k http://$HOST:5173 > /dev/null 2>&1 &
    PIDS+=($!)
done

echo "All clients started!"
echo "Check stats: curl http://192.168.1.6:3000/api/stats"
echo ""
echo "Press Ctrl+C to kill all clients"

# Kill all PIDs on exit
cleanup() {
    echo "Killing all clients..."
    for pid in "${PIDS[@]}"; do
        kill $pid 2>/dev/null
    done
    exit
}

trap cleanup SIGINT
wait
