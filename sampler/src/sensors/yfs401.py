import asyncio
import pigpio
from time import time
from typing import Optional
from dataclasses import dataclass, asdict
from threading import Lock

@dataclass
class YFS401Reading:
    """Data class for YFS401 reading information."""
    pulses: int # Pulses in this measurement interval
    total_pulses: int # Total pulses since start
    liters_per_second: float # Flow rate in L/s
    liters_per_minute: float # L/min
    ml_per_second: float # mL/s
    total_liters: float

    # def to_dict(self):
    #     """Convert to dict for JSON/DB insertion"""
    #     return asdict(self)

@dataclass
class YFS401Config:
    """Configuration for the flow meter"""
    pin: int # GPIO pin (BCM numbering)
    calibrationFactor: float # Pulses per liter (default: 5880)
    sampleInterval: float # Measurement interval in ms (default: 1000 ms)
    debounceTimeout: float # Debounce time in ms (default: 0.2 ms)


class YFS401:
    """
    FlowMeter class for reading YF-S401 water flow sensor.

    The YF-S401 generates pulses as water flows through it. The number of pulses
    is proportional to the volume of water. By counting pulses over time intervals,
    we can calculate the flow rate.

    Tested with signal at 27/255 duty cycle and 976 Hz.
    So the recommended maximum pulse frequency is 4.6 kHz

    Example:
        const meter = new FlowMeter({ pin: 17 });
        await meter.start();

        meter.on('reading', (data) => {
         console.log(`Flow: ${data.litersPerMinute.toFixed(2)} L/min`);
        });

        // Later...
        await meter.stop();
    """

    def __init__(
            self,
            pin: int,
            calibration_factor: Optional[float] = 5880,
            sample_interval: Optional[float] = 1,
            debounce_timeout: Optional[float] = 0.2
    ):
        """
        Initialize YF-S401 flow sensor.

        Args:
            pin: GPIO pin (BCM numbering, 0-27)
            calibration_factor: Pulses per liter (default 5880 for YF-S401)
            sample_interval: Measurement interval in seconds (default 1.0)

        Raises:
            ValueError: If parameters are invalid
            RuntimeError: If pigpio daemon is not running
        """
        # Validations
        if not (0 <= pin <= 27):
            raise ValueError(f"Invalid GPIO pin: {pin}. Must be 0-27")
        if calibration_factor <= 0:
            raise ValueError("Calibration factor must be positive.")
        if sample_interval <= 0.1:
            raise ValueError("Sample interval must be at least 100 ms.")
        if debounce_timeout < 0.11:
            raise ValueError("Debounce timeout must be at least 0.110 ms.")

        self.config: YFS401Config = YFS401Config(
            pin,
            calibration_factor,
            sample_interval,
            debounce_timeout
        )

        # State tracking
        self.pi: Optional[pigpio.pi] = None
        self.callback_handle = None
        self.is_running = False
        self._lock = Lock()
        self._calculation_task: Optional[asyncio.Task] = None

        # Pulse tracking - only increments.
        self.pulse_count = 0
        self.last_measured_pulse_count = 0

        # Timing
        self.last_measurement_time = 0

        #Current reading
        self.current_reading = YFS401Reading(
            pulses=0,
            total_pulses=0,
            liters_per_second=0.0,
            liters_per_minute=0.0,
            ml_per_second=0.0,
            total_liters=0.0
        )

        self.start()

    def start(self) -> None:
        """
        Start monitoring the flow sensor.
        Raises:
            RuntimeError: If already running or pigpio daemon not available
        """
        if self.is_running:
            raise RuntimeError("YF-S401 is already running")

        self.pi = pigpio.pi()
        if not self.pi.connected:
            raise RuntimeError(
                "Could not connect to pigpio daemon. "
                "Start it with: sudo systemctl start pigpiod"
            )
        self.pi.set_mode(self.config.pin, pigpio.INPUT)
        self.pi.set_pull_up_down(self.config.pin, pigpio.PUD_UP)
        self.pi.set_glitch_filter(self.config.pin, int(self.config.debounceTimeout*1000))
        self.callback_handle = self.pi.callback(
            self.config.pin,
            pigpio.RISING_EDGE,
            self._count_pulse
        )

        self.is_running = True
        self.last_measurement_time = time()

    def stop(self) -> None:
        """Stop monitoring and clean up resources."""
        if not self.is_running:
            return

        if self._calculation_task and not self._calculation_task.done():
            self._calculation_task.cancel()

        if self.pi:
            self.pi.stop()
            self.pi = None

        self.is_running = False

    def _count_pulse(self, gpio: int, level: int, tick: int) -> None:
        """Internal: increment pulse counter (called by pigpio on interrupt)."""
        with self._lock:
            self.pulse_count += 1

    def _calculate_flow(
            self,
            pulses: int,
            elapsed_seconds: float
    ) -> YFS401Reading:
        """
        Calculate flow rates from pulse count and elapsed time.

        Args:
            pulses: Number of pulses in the interval
            elapsed_seconds: Time elapsed in seconds

        Returns:
            YFS401Reading with calculated values
        """
        # Convert pulses to volume
        liters_this_interval = pulses / self.config.calibrationFactor
        total_liters = self.pulse_count / self.config.calibrationFactor

        # Calculate flow rates (volume per unit time)
        if elapsed_seconds > 0:
            liters_per_second = liters_this_interval / elapsed_seconds
        else:
            liters_per_second = 0.0

        liters_per_minute = liters_per_second * 60.0
        ml_per_second = liters_per_second * 1000.0

        return YFS401Reading(
            pulses,
            self.pulse_count,
            liters_per_second,
            liters_per_minute,
            ml_per_second,
            total_liters
        )

    async def get_current_reading(self) -> YFS401Reading:
        """
        Calculate and return the current reading based on accumulated pulses.
        Can be called from orchestrator at any interval.


        Returns:
            YFS401Reading object with current measurements

        Raises:
            RuntimeError: If sensor is not running
        """
        if not self.is_running:
            raise RuntimeError("YF-S401 is not running. Call start() first")

        current_time = time()

        with self._lock:
            # Calculations
            pulses_this_interval = (self.pulse_count - self.last_measured_pulse_count)
            elapsed_seconds = current_time - self.last_measurement_time
            # Tracking
            self.last_measured_pulse_count = self.pulse_count
            self.last_measurement_time = current_time

        return self._calculate_flow(pulses_this_interval, elapsed_seconds)


    async def run_calculation_loop(self) -> None:
        """
        Run an internal calculation loop at a fixed interval.
        Updates self.current_reading periodically.
        """
        try:
            while self.is_running:
                self.current_reading = await self.get_current_reading()
                await asyncio.sleep(self.config.sampleInterval)
        except asyncio.CancelledError:
            self.stop()

    @property
    def reading(self) -> YFS401Reading:
        """Property accessor for current reading."""
        return self.current_reading

    def is_active(self) -> bool:
        return self.is_running

if __name__ == "__main__":
    print("Starting YF-S401 flow sensor with pigpio...")
    print("Make sure pigpiod is running: sudo systemctl start pigpiod\n")
    hose = YFS401(27, debounce_timeout=0.1)

    async def print_values(sensor: YFS401):
        """Print sensor readings every second"""
        while True:
            reading = sensor.reading
            print(f"Flow: {reading.liters_per_minute:.2f} L/min | "
                  f"Total: {reading.total_liters:.3f} L | "
                  f"Pulses: {reading.pulses}")
            await asyncio.sleep(1)


    async def main():
        """Main async function"""
        # Create tasks
        tasks = [
            asyncio.create_task(print_values(hose)),
            asyncio.create_task(hose.run_calculation_loop())
        ]

        try:
            await asyncio.gather(*tasks, return_exceptions=True)
        except KeyboardInterrupt:
            print("\nStopping...")
        finally:
            hose.stop()
            print("Sensor stopped")


    # Run
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nExiting...")
        hose.stop()