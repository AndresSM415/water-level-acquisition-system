# Bun Test Server - Deployment Guide for Raspberry Pi Zero 2

This guide will help you install Bun on your Raspberry Pi Zero 2 and run the test server to evaluate its reliability.

## Prerequisites

**CRITICAL**: Bun requires a 64-bit operating system. Before proceeding, verify your Pi is running 64-bit OS:

```bash
uname -m
```

You should see `aarch64`. If you see `armv7l`, you're running 32-bit OS and Bun will NOT work. You'll need to reinstall with 64-bit Raspberry Pi OS.

## Step 1: Install Bun

On your Raspberry Pi Zero 2, run the official installation script:

```bash
curl -fsSL https://bun.sh/install | bash
```

After installation, you need to add Bun to your PATH. The installer will tell you what to add. Usually it's:

```bash
echo 'export PATH="$HOME/.bun/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

Verify the installation:

```bash
bun --version
```

If you see a version number, Bun installed successfully. If you get "command not found" or "no such file or directory", check the troubleshooting section below.

## Step 2: Transfer the Test Server

Copy the `bun-test-server.ts` file to your Raspberry Pi. You can use `scp`:

```bash
# Run this from your development machine
scp bun-test-server.ts pi@raspberrypi.local:~/
```

Or create the file directly on the Pi using nano:

```bash
nano bun-test-server.ts
# Paste the contents, then Ctrl+X, Y, Enter to save
```

## Step 3: Run the Test Server

Navigate to the directory containing the test server and run it:

```bash
cd ~
bun run bun-test-server.ts
```

You should see output like:
```
✓ Database initialized
✓ Data generator started
✓ Data cleanup scheduler started
============================================================
🚀 Bun Test Server Started Successfully
============================================================
📍 URL: http://localhost:3000
...
```

If it starts successfully, that's a good sign! But we need to test it thoroughly.

## Step 4: Access the Web Interface

From another computer on your network, open a web browser and navigate to:

```
http://raspberrypi.local:3000
```

Or use the Pi's IP address:
```
http://192.168.1.X:3000
```

You should see the test interface with server statistics and sensor readings.

## Step 5: Run Reliability Tests

### Test 1: Connection Stability
1. Click "Connect to Real-Time Updates" 
2. Verify that sensor readings update every second
3. Leave this connection open for several hours
4. Check if the connection stays stable or disconnects

### Test 2: Concurrent Load
1. Click "Test Concurrent Requests (20x)"
2. Note the response time
3. Repeat this test multiple times
4. Watch for any errors or crashes

### Test 3: Database Operations
1. Click "Query Database (Last 100 Records)"
2. Verify it completes successfully
3. Download a CSV file to test file generation
4. Check if the database grows properly over time

### Test 4: Long-Running Stability
This is the most important test. Let the server run for 24-48 hours and monitor:

**Memory Usage**: Check memory consumption periodically
```bash
# Run this on the Pi in another terminal
top -p $(pgrep -f bun-test-server)
```

Watch the `%MEM` column. It should stay relatively stable. If memory keeps growing, that's a memory leak.

**CPU Usage**: Should be low (under 20%) when idle

**Error Count**: Check the web interface statistics. The error count should stay at 0 or very low.

**Crashes**: If Bun crashes, you'll see the terminal exit or show an error. This is a red flag.

**System Logs**: Check for any system-level errors
```bash
journalctl -f
```

### Test 5: Multiple Clients
Open the web interface from 3-4 different browsers/devices simultaneously. Connect them all to real-time updates. This simulates your expected 40 concurrent users scenario (scaled down).

## Step 6: Monitor Key Metrics

While the test runs, track these metrics in a text file:

```
Hour 0: Memory: X%, CPU: Y%, Errors: 0, Status: OK
Hour 1: Memory: X%, CPU: Y%, Errors: 0, Status: OK
...
```

Pay special attention to:
- **Memory growth**: Should stabilize after initial startup
- **Connection drops**: SSE clients disconnecting unexpectedly
- **Database errors**: Any issues writing/reading from SQLite
- **System crashes**: Complete Bun process termination

## Troubleshooting Common Issues

### Issue: "bun: command not found"
**Solution**: The PATH wasn't updated. Use the full path:
```bash
~/.bun/bin/bun run bun-test-server.ts
```

Or manually add to PATH:
```bash
export PATH="$HOME/.bun/bin:$PATH"
```

### Issue: "No such file or directory" when running bun
**Solution**: This often means you're on 32-bit OS or the binary is corrupted.
1. Verify 64-bit: `uname -m` should show `aarch64`
2. Try reinstalling Bun
3. Check if the binary exists: `ls -la ~/.bun/bin/bun`

### Issue: "Illegal instruction" error
**Solution**: This is a known issue with Bun on certain ARM processors. It might mean Bun isn't compatible with your Pi Zero 2. Unfortunately, there's no easy fix for this.

### Issue: Server crashes after a few hours
**Solution**: This indicates stability problems. Note when it crashes and check:
```bash
# Check system logs
journalctl -xe | tail -100

# Check for out-of-memory issues
dmesg | grep -i "out of memory"
```

### Issue: Port 3000 already in use
**Solution**: Change the PORT constant in the test server file:
```typescript
const PORT = 3001; // or any available port
```

## Running as a Background Service

To test long-term stability, you can run the server as a systemd service:

1. Create a service file:
```bash
sudo nano /etc/systemd/system/bun-test.service
```

2. Add this content:
```ini
[Unit]
Description=Bun Test Server
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi
ExecStart=/home/pi/.bun/bin/bun run /home/pi/bun-test-server.ts
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

3. Enable and start the service:
```bash
sudo systemctl enable bun-test.service
sudo systemctl start bun-test.service
```

4. Check the status:
```bash
sudo systemctl status bun-test.service
```

5. View logs:
```bash
sudo journalctl -u bun-test.service -f
```

If the service keeps restarting, check the restart count:
```bash
systemctl show bun-test.service | grep NRestarts
```

A high restart count indicates crashes, which would be a red flag for using Bun in production.

## Decision Criteria

After running these tests for 24-48 hours, evaluate:

### ✅ Good Signs (Bun is working well)
- No crashes or unexpected restarts
- Memory usage is stable
- All tests complete successfully
- SSE connections remain stable
- Error count stays at 0
- Response times are consistent

### ⚠️ Warning Signs (Proceed with caution)
- Occasional disconnections but recovers
- Slow memory growth
- Few errors (< 5 in 24 hours)
- Slower than expected performance

### 🚫 Red Flags (Don't use Bun)
- Server crashes even once
- "Illegal instruction" errors
- Rapidly growing memory usage
- High error count
- SSE connections constantly dropping
- Database corruption

## Next Steps

**If Bun passes all tests**: Great! You can proceed with building your full water monitoring system in TypeScript with Bun.

**If Bun shows warning signs**: Consider whether you're comfortable troubleshooting these issues. For a learning project, this might be acceptable. For production, it's risky.

**If Bun fails critically**: Switch to Node.js. Your TypeScript code will work with minimal changes. Just replace `bun run` with `tsx` or compile with `tsc`.

## Comparing to Node.js

If you want to compare, you can install Node.js and run a similar test:

```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install tsx (TypeScript executor for Node)
npm install -g tsx

# Run the same test server
tsx bun-test-server.ts
```

Note: The Bun-specific APIs (`bun:sqlite` and `serve`) won't work with Node. You'd need to use `better-sqlite3` and a framework like Fastify instead. But this gives you a performance comparison baseline.

## Questions to Answer

After your testing period, you should be able to answer:

1. Did Bun run stably for the entire test period?
2. Was memory usage acceptable for the Pi Zero 2's 512MB?
3. Did any crashes occur? If so, what caused them?
4. Were the response times adequate for 40 concurrent users?
5. Did the SSE connections stay stable?
6. Would you trust this for a production system?

Document your findings! They'll help you make an informed decision about whether to commit to Bun or use Node.js instead.
