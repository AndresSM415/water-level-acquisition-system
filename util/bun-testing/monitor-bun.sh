#!/bin/bash

# Bun Performance Monitor
# This script tracks key metrics of the Bun test server over time
# Run it in a separate terminal while your test server is running

# Configuration
LOG_FILE="bun-performance-log.txt"
INTERVAL=300  # Check every 5 minutes (300 seconds)
SERVER_URL="http://localhost:3000/api/stats"

echo "============================================================"
echo "Bun Performance Monitor"
echo "============================================================"
echo "Logging to: $LOG_FILE"
echo "Check interval: ${INTERVAL}s ($(($INTERVAL / 60)) minutes)"
echo "Press Ctrl+C to stop"
echo "============================================================"
echo ""

# Create/clear log file with header
echo "Bun Performance Log - Started $(date)" > "$LOG_FILE"
echo "Timestamp,Uptime(s),Memory(%),CPU(%),PID,Requests,Errors,SSE Clients,Status" >> "$LOG_FILE"

# Function to get process stats
get_process_stats() {
    # Find Bun process running the test server
    PID=$(pgrep -f "bun.*bun-test-server")
    
    if [ -z "$PID" ]; then
        echo "NOT_RUNNING,0,0,0,N/A,N/A,N/A,N/A,CRASHED"
        return
    fi
    
    # Get memory and CPU usage using top
    # On Linux, we use top in batch mode
    STATS=$(top -b -n 1 -p "$PID" | tail -1)
    
    # Extract CPU and memory percentage
    # Format varies by system, adjust if needed
    CPU=$(echo "$STATS" | awk '{print $9}')
    MEM=$(echo "$STATS" | awk '{print $10}')
    
    # Get server stats from API
    if SERVER_STATS=$(curl -s "$SERVER_URL" 2>/dev/null); then
        UPTIME=$(echo "$SERVER_STATS" | grep -o '"startTime":[0-9]*' | cut -d: -f2)
        REQUESTS=$(echo "$SERVER_STATS" | grep -o '"totalRequests":[0-9]*' | cut -d: -f2)
        ERRORS=$(echo "$SERVER_STATS" | grep -o '"errors":[0-9]*' | cut -d: -f2)
        SSE=$(echo "$SERVER_STATS" | grep -o '"sseClients":[0-9]*' | cut -d: -f2)
        
        # Calculate actual uptime
        CURRENT_TIME=$(date +%s)000  # milliseconds
        UPTIME_SEC=$((($CURRENT_TIME - $UPTIME) / 1000))
        
        STATUS="RUNNING"
    else
        UPTIME_SEC="N/A"
        REQUESTS="N/A"
        ERRORS="N/A"
        SSE="N/A"
        STATUS="API_ERROR"
    fi
    
    echo "$(date +%s),$UPTIME_SEC,$MEM,$CPU,$PID,$REQUESTS,$ERRORS,$SSE,$STATUS"
}

# Function to display stats in console
display_stats() {
    local TIMESTAMP=$1
    local UPTIME=$2
    local MEM=$3
    local CPU=$4
    local PID=$5
    local REQUESTS=$6
    local ERRORS=$7
    local SSE=$8
    local STATUS=$9
    
    local HOURS=$((UPTIME / 3600))
    local MINUTES=$(((UPTIME % 3600) / 60))
    local SECONDS=$((UPTIME % 60))
    
    echo "┌─────────────────────────────────────────────────────────┐"
    printf "│ Time: %-49s │\n" "$(date)"
    echo "├─────────────────────────────────────────────────────────┤"
    printf "│ Status:   %-45s │\n" "$STATUS"
    printf "│ Uptime:   %02d:%02d:%02d %-36s │\n" $HOURS $MINUTES $SECONDS ""
    echo "├─────────────────────────────────────────────────────────┤"
    printf "│ PID:      %-45s │\n" "$PID"
    printf "│ Memory:   %-45s │\n" "$MEM%"
    printf "│ CPU:      %-45s │\n" "$CPU%"
    echo "├─────────────────────────────────────────────────────────┤"
    printf "│ Requests: %-45s │\n" "$REQUESTS"
    printf "│ Errors:   %-45s │\n" "$ERRORS"
    printf "│ SSE:      %-45s │\n" "$SSE clients"
    echo "└─────────────────────────────────────────────────────────┘"
    echo ""
}

# Main monitoring loop
ITERATION=0
LAST_PID=""

while true; do
    # Get stats
    STATS=$(get_process_stats)
    
    # Parse stats
    IFS=',' read -r TIMESTAMP UPTIME MEM CPU PID REQUESTS ERRORS SSE STATUS <<< "$STATS"
    
    # Log to file
    echo "$STATS" >> "$LOG_FILE"
    
    # Clear screen and display stats
    clear
    
    echo "============================================================"
    echo "Bun Performance Monitor - Check #$((ITERATION + 1))"
    echo "============================================================"
    echo ""
    
    display_stats "$TIMESTAMP" "$UPTIME" "$MEM" "$CPU" "$PID" "$REQUESTS" "$ERRORS" "$SSE" "$STATUS"
    
    # Check for problems and alert
    if [ "$STATUS" == "CRASHED" ]; then
        echo "⚠️  WARNING: Server process not found! The server may have crashed."
        echo "Check the server terminal for error messages."
        echo ""
        
        # Check if it was running before
        if [ ! -z "$LAST_PID" ]; then
            echo "🚨 CRASH DETECTED! Server was running (PID: $LAST_PID) and now is not."
            echo "This is a critical failure for production use."
            echo ""
        fi
    fi
    
    if [ "$STATUS" == "API_ERROR" ]; then
        echo "⚠️  WARNING: Server API is not responding."
        echo "The process is running but HTTP server may be hung."
        echo ""
    fi
    
    if [ "$STATUS" == "RUNNING" ]; then
        # Check for high memory usage (>80%)
        if (( $(echo "$MEM > 80" | bc -l 2>/dev/null || echo 0) )); then
            echo "⚠️  WARNING: High memory usage detected (${MEM}%)"
            echo "This may indicate a memory leak."
            echo ""
        fi
        
        # Check for errors
        if [ "$ERRORS" != "N/A" ] && [ "$ERRORS" -gt 0 ]; then
            echo "⚠️  WARNING: $ERRORS errors detected"
            echo "Check the server logs for details."
            echo ""
        fi
        
        # All good message
        if [ "$ERRORS" == "0" ] && (( $(echo "$MEM < 80" | bc -l 2>/dev/null || echo 0) )); then
            echo "✅ Server is running normally"
            echo ""
        fi
    fi
    
    LAST_PID=$PID
    
    echo "Next check in ${INTERVAL}s ($(($INTERVAL / 60)) minutes)..."
    echo "Log file: $LOG_FILE"
    
    ITERATION=$((ITERATION + 1))
    
    # Sleep for the interval
    sleep $INTERVAL
done
