import time
import board
import busio
import adafruit_ads1x15.ads1115 as ADS
from adafruit_ads1x15.ads1x15 import Pin as ADS_Pin
from adafruit_ads1x15.analog_in import AnalogIn


i2c = busio.I2C(board.SCL, board.SDA)

# Create the ADS object and specify the gain
ads = ADS.ADS1115(i2c)
ads.gain = 1
ads.data_rate = 8
chan0 = AnalogIn(ads, ADS_Pin.A0, ADS_Pin.A1)
chan1 = AnalogIn(ads, ADS_Pin.A2, ADS_Pin.A3)

# Continuously print the values
while True:
    print(f"ch0: {round(chan0.voltage, 3)}V, ch1: {round(chan1.voltage, 3)}V")
    time.sleep(1)
