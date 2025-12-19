# Water Level Acquisition System

## Installation Steps

### 1. Update the System
```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Clone and navigate to the repository to run the installation script
```bash
git clone https://github.com/AndresSM415/water-level-acquisition-system.git
cd water-level-acquisition-system
sudo ./install.sh
```

The script will:
- Install all dependencies (Bun, UV, Python, SQLite3, pigpio).
- Build the frontend and backend services.
- Configure systemd services and schedules.
- Install and configure RaspAP hotspot.

### 3. Reboot the System
```bash
sudo reboot
```


### 4. Reconfigure RaspAP WiFi Hotspot (Optional)
Once rebooted, connect to the Open RaspAP WiFi hotspot:
1. **Connect to WiFi:**
   - Look for a open WiFi network named `Tanques Interconectados`.

2. **Access RaspAP Dashboard:**
   - Open a web browser
   - Go to: `http://10.3.141.1/8080`
   - Default credentials: `admin` / `secret`

3. **Change Network Settings:**
   - Click on "Hotspot" in the left menu
   - Change the Network SSID and password
   - Change the Admin username and password

4. **Reboot**
   - In an ssh session or directly on the raspberry `sudo reboot`
   - On the RaspAp dashboard `System/Basic/Reboot`

After rebooting, you can now access the Water Level Acquisition System web dashboard:

```
http://10.3.141.1
```
or
```
http://10.3.141.1:3000
```

The dashboard should load with real-time sensor data from the water tank system.

## Troubleshooting

### Services Not Starting
Check the status of the backend and sampler services:
```bash
sudo systemctl status wlas-backend.service
sudo systemctl status wlas-sampler.service
tail -f /var/log/wlas/sampler.log
tail -f /var/log/wlas/server.log
```
Possible reasons:
- Hardware: Bad PCB or components such as the ADC. Inspect it.
- Dependencies or project not build correctly. Rerun the installation script.

### Can't find WiFi or connect to it.
- The RaspAP hotspot should appear as an open network after installation.
- If it gets stuck loading then the Hotspot service is failing due to a wrong configuration.
- Check:
```bash
sudo systemctl status hostapd
sudo systemctl status dnsmasq
```
- Rerun the installation script.

### Dashboard web page not Loading
- Ensure the backend is running:
```bash
curl http://10.3.141.1:3000/info
```
Should return a JSON response with server information. 
If not restart the raspberry or rerun the installation script.

### Sensor Data Not Appearing
Check if the sampler is running:
```bash
sudo systemctl status wlas-sampler.service
```

Verify pigpio daemon is running:
```bash
sudo systemctl status pigpiod
```

Check if data is fetched correctly:
```bash
tail -f /var/log/wlas/sampler.log
```

## Service Management
Control the services manually with these commands:
```bash
# Start services
sudo systemctl start wlas-backend.service
sudo systemctl start wlas-sampler.service

# Stop services
sudo systemctl stop wlas-backend.service
sudo systemctl stop wlas-sampler.service

# Restart services
sudo systemctl restart wlas-backend.service
sudo systemctl restart wlas-sampler.service
```
### Reconnect to Internet
Turn off the Raspberry Hotspot:
```bash
sudo systemctl disable hostapd.service
sudo systemctl enable NetworkManager.service
sudo reboot
```
Re-enable the Hotspot:
```bash
sudo systemctl disable NetworkManager.service
sudo systemctl enable hostapd.service
sudo reboot
```

## Data Management
Sensor data is stored in a SQLite database. To view the database:
```bash
sqlite3 /var/lib/wlas/samples.sqlite
```

## Next Steps

1. Verify the sensors are reading correctly in the dashboard
2. Run an experiment and verify data collection
3. Download data as CSV for analysis in MATLAB