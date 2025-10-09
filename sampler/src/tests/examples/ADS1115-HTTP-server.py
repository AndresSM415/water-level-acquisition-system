#!/usr/bin/env python3
"""
ADS1115 I2C Server for Bun application
Exposes ADS1115 ADC readings via HTTP REST API
"""

import json
import logging
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import board
import busio
import adafruit_ads1x15.ads1115 as ADS
from adafruit_ads1x15.analog_in import AnalogIn
from adafruit_ads1x15.ads1x15 import Pin as ADS_Pin

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# I2C setup
i2c = busio.I2C(board.SCL, board.SDA)
ads = ADS.ADS1115(i2c, address=0x48)

# Configure gain and data rate
# Gain options: 2/3, 1, 2, 4, 8, 16
# Data rate (samples per second): 8, 16, 32, 64, 128, 250, 475, 860
ads.gain = 1
ads.data_rate = 8

# Create analog input channels
channels = {
    0: AnalogIn(ads, ADS_Pin.A0, ADS_Pin.A1),
    1: AnalogIn(ads, ADS_Pin.A2, ADS_Pin.A3)
}


class ADS1115Handler(BaseHTTPRequestHandler):
    """HTTP request handler for ADS1115 readings"""

    def do_GET(self):
        """Handle GET requests"""
        parsed_path = urlparse(self.path)
        path = parsed_path.path
        query_params = parse_qs(parsed_path.query)

        try:
            if path == "/read":
                self.handle_read(query_params)
            elif path == "/read/all":
                self.handle_read_all()
            elif path == "/health":
                self.handle_health()
            else:
                self.send_error(404, "Not Found")
        except Exception as e:
            logger.error(f"Error handling request: {e}")
            self.send_json_response(
                {"error": str(e)},
                status=500
            )

    def handle_read(self, query_params):
        """
        Read a specific channel
        Usage: GET /read?channel=0
        Returns: {"channel": 0, "voltage": 1.234, "value": 2048}
        """
        if "channel" not in query_params:
            self.send_json_response(
                {"error": "Missing 'channel' parameter. Use: /read?channel=0-3"},
                status=400
            )
            return

        try:
            channel = int(query_params["channel"][0])
            if channel not in channels:
                self.send_json_response(
                    {"error": f"Invalid channel {channel}. Must be 0-1"},
                    status=400
                )
                return

            ch = channels[channel]
            response = {
                "channel": channel,
                "voltage": round(ch.voltage, 5),
                "value": ch.value
            }
            self.send_json_response(response)
        except ValueError:
            self.send_json_response(
                {"error": "Channel must be an integer 0-1"},
                status=400
            )

    def handle_read_all(self):
        """
        Read all channels at once
        Usage: GET /read/all
        Returns: {"channels": [{"channel": 0, "voltage": 1.234, "value": 2048}, ...]}
        """
        try:
            readings = []
            for ch_num, ch in channels.items():
                readings.append({
                    "channel": ch_num,
                    "voltage": round(ch.voltage, 5),
                    "value": ch.value
                })
            self.send_json_response({"channels": readings})
        except Exception as e:
            self.send_json_response(
                {"error": f"Failed to read channels: {str(e)}"},
                status=500
            )

    def handle_health(self):
        """
        Health check endpoint
        Usage: GET /health
        Returns: {"status": "ok"}
        """
        self.send_json_response({"status": "ok"})

    def send_json_response(self, data, status=200):
        """Send a JSON response"""
        self.send_response(status)
        self.send_header("Content-type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def log_message(self, format, *args):
        """Override to use logger instead of stderr"""
        logger.info("%s - %s" % (self.client_address[0], format % args))


def run_server(host="0.0.0.0", port=8001):
    """Run the HTTP server"""
    server_address = (host, port)
    httpd = HTTPServer(server_address, ADS1115Handler)
    logger.info(f"Starting ADS1115 server on {host}:{port}")
    logger.info("Available endpoints:")
    logger.info(f"  GET http://localhost:{port}/read?channel=0-3")
    logger.info(f"  GET http://localhost:{port}/read/all")
    logger.info(f"  GET http://localhost:{port}/health")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        logger.info("Shutting down server...")
        httpd.shutdown()


if __name__ == "__main__":
    run_server()
