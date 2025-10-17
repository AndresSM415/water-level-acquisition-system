import board
import busio
import adafruit_ads1x15.ads1115 as ADS
from adafruit_ads1x15.ads1x15 import Pin as ADS_Pin
from adafruit_ads1x15.analog_in import AnalogIn

class ADS1115:

    def __init__(self):
        i2c = busio.I2C(board.SCL, board.SDA)
        self.ads = ADS.ADS1115(i2c, address=0x48)
        # Configure gain and data rate
        # Gain options: 2/3, 1, 2, 4, 8, 16
        # Data rate (samples per second): 8, 16, 32, 64, 128, 250, 475, 860
        self.ads.gain = 1
        self.ads.data_rate = 8
        self.ch = {
            0: AnalogIn(self.ads, ADS_Pin.A0),
            1: AnalogIn(self.ads, ADS_Pin.A1),
            2: AnalogIn(self.ads, ADS_Pin.A2),
            3: AnalogIn(self.ads, ADS_Pin.A3)
        }

    def voltage(self, ch: int) -> float:
        """Returns the voltage from the ADC pin as a floating point value."""
        if ch not in self.ch:
            raise ValueError(f"Invalid channel {ch}. Must be {self.ch.keys()}")
        return round(self.ch[ch].voltage, 5)

    def value(self, ch: int) -> float:
        """The value on the analog pin between 0 and 65,535
        inclusive (16-bit). (read-only)

        Even if the underlying analog to digital converter (ADC) is
        lower resolution, the value is 16-bit.
        """
        if not ch in self.ch:
            raise ValueError(f"Invalid channel {ch}. {self.ch.keys()}")
        return self.ch[ch].value


if __name__ == "__main__":
    import time
    adc = ADS1115()
    while True:
        print(
            f"ch0: {round(adc.voltage(0), 3)}V, "
            f"ch1: {round(adc.voltage(1), 3)}V, "
            f"ch2: {round(adc.voltage(2), 3)}V, "
        )
        time.sleep(0.2)

