"""
PWM Reader for Raspberry Pi GPIO pins using pigpio.

This module provides a class for monitoring PWM signals and calculating
duty cycle and frequency. It uses the pigpio library which provides
accurate timing through the pigpio daemon.

Tested with pwm signals at 976 Hz

Usage:
    reader = PWMReader(pin=17, expected_frequency=490)
    reader.start()

    # Option 1: Get readings via callback
    def on_reading(data):
        print(f"Duty cycle: {data['duty_cycle']}%")

    reader.on_reading(on_reading)

    # Option 2: Poll for current value
    current = reader.get_current_reading()

    # Always cleanup when done
    reader.stop()
"""

import pigpio
from typing import Optional, Callable, Dict, Any
from dataclasses import dataclass

from src.config import configure_logger

@dataclass
class PWMReading:
    """Data class for PWM reading information"""
    duty_cycle: float  # Percentage (0-100)
    frequency: float  # Hz


class PWMReader:
    """
    PWM Reader class for monitoring PWM signals on Raspberry Pi GPIO pins.

    This class uses the pigpio library to monitor digital signals and calculate
    duty cycle and frequency. It works well with typical Arduino PWM signals.

    Attributes:
        pin: GPIO pin (BCM numbering)
        expected_frequency: Expected PWM frequency in Hz (optional)
        frequency_tolerance: Allowed deviation from expected frequency (0-1)
        pull_up_down: Pull up/down resistor configuration (optional)
    """
    def __init__(
            self,
            pin: int,
            expected_frequency: Optional[float] = None,
            frequency_tolerance: float = 0.2,
            pull_up_down: Optional[int] = None
    ):
        """
        Initialize PWM Reader.

        Args:
            pin: GPIO pin (0-27)
            expected_frequency: Expected PWM frequency in Hz
            frequency_tolerance: Allowed deviation (default 0.2 = 20%)
            pull_up_down: pigpio.PUD_UP, pigpio.PUD_DOWN, or None

        Raises:
            ValueError: If pin or tolerance is invalid
        """
        # Validate pin number
        if not (0 <= pin <= 27):
            raise ValueError(f"Invalid GPIO pin: {pin}. Must be 0-27")

        # Validate tolerance
        if not 0 <= frequency_tolerance <= 1:
            raise ValueError(f"Tolerance must be 0-1, got {frequency_tolerance}")

        self.pin = pin
        self.expected_frequency = expected_frequency
        self.frequency_tolerance = frequency_tolerance
        self.pull_up_down = pull_up_down

        # Calculate expected period if frequency provided
        self.expected_period = None
        if expected_frequency:
            self.expected_period = 1_000_000 / expected_frequency  # microseconds

        # State tracking
        self.pi: Optional[pigpio.pi] = None
        self.is_running = False

        # Timing variables
        self.last_rising_tick: Optional[int] = None
        self.last_falling_tick: Optional[int] = None

        # Current reading
        self.current_reading = PWMReading(
            duty_cycle=0.0,
            frequency=0.0
        )

        # Statistics
        self.valid_readings = 0
        self.total_readings = 0

        # Callbacks
        self._reading_callbacks: list[Callable] = []
        self._invalid_reading_callbacks: list[Callable] = []

        self._start()

    def _start(self) -> None:
        """
        Initialize and start monitoring the PWM signal.

        Raises:
            RuntimeError: If already running or pigpio daemon not available
        """
        if self.is_running:
            raise RuntimeError("PWM Reader is already running")

        # Connect to pigpio daemon
        self.pi = pigpio.pi()
        if not self.pi.connected:
            raise RuntimeError(
                "Could not connect to pigpio daemon. "
                "Make sure it's running: sudo pigpiod"
            )

        if self.pull_up_down is not None:
            self.pi.set_pull_up_down(self.pin, self.pull_up_down)

        self.pi.set_mode(self.pin, pigpio.INPUT)

        # Register edge detection callback
        self.pi.callback(self.pin, pigpio.EITHER_EDGE, self._handle_edge)

        self.is_running = True

    def stop(self) -> None:
        """
        Stop monitoring and clean up resources.
        Always call this when done to prevent resource leaks.
        """
        if not self.is_running:
            return

        self.is_running = False

        # Cleanup pigpio connection
        if self.pi:
            self.pi.stop()
            self.pi = None

    @staticmethod
    def _tick_diff(start_tick: int, end_tick: int) -> int:
        """
        Calculate the difference between ticks, handling 32-bit wraparound.

        The pigpio tick counter is a 32-bit microsecond counter that wraps
        around approximately every 72 minutes.
        """
        diff = end_tick - start_tick

        # Handle wraparound
        if diff < 0:
            diff += 0x100000000  # Add 2^32

        return diff

    def _is_valid_period(self, period: int) -> bool:
        """
        Check if the measured period is within expected bounds.

        Args:
            period: Measured period in microseconds

        Returns:
            True if the period is valid, False if likely noise/glitch
        """
        # If no expected frequency, accept any positive period
        if self.expected_period is None:
            return period > 0

        min_period = self.expected_period * (1 - self.frequency_tolerance)
        max_period = self.expected_period * (1 + self.frequency_tolerance)

        return min_period <= period <= max_period

    def _handle_edge(self, gpio: int, level: int, tick: int) -> None:
        """
        Handle edge detection events from pigpio.
        Called automatically when GPIO pin changes state.

        Args:
            gpio: GPIO pin
            level: 0 for falling edge, 1 for rising edge
            tick: Timestamp in microseconds
        """
        if level == 1:  # Rising edge
            if self.last_rising_tick is not None and self.last_falling_tick is not None:
                # Complete cycle: rising -> falling -> rising
                period = self._tick_diff(self.last_rising_tick, tick)
                high_time = self._tick_diff(self.last_rising_tick, self.last_falling_tick)

                self.total_readings += 1

                # Validate reading
                if self._is_valid_period(period) and 0 < high_time < period:
                    # Valid reading
                    duty_cycle = (high_time / period) * 100
                    frequency = 1_000_000 / period

                    self.current_reading = PWMReading(
                        duty_cycle=duty_cycle,
                        frequency=frequency
                    )

                    self.valid_readings += 1

                    # Notify callbacks
                    for callback in self._reading_callbacks:
                        callback(self.current_reading)

                else:
                    # Invalid reading
                    reason = (
                        "Period outside tolerance"
                        if not self._is_valid_period(period)
                        else "Invalid high time"
                    )

                    for callback in self._invalid_reading_callbacks:
                        callback({
                            'period': period,
                            'expected_period': self.expected_period,
                            'reason': reason
                        })

            self.last_rising_tick = tick

        else:  # Falling edge
            self.last_falling_tick = tick

    def on_reading(self, callback: Callable[[PWMReading], None]) -> None:
        """
        Register a callback for valid PWM readings.

        Args:
            callback: Function that takes a PWMReading object
        """
        self._reading_callbacks.append(callback)

    def on_invalid_reading(self, callback: Callable[[Dict], None]) -> None:
        """
        Register a callback for invalid PWM readings.

        Args:
            callback: Function that takes a dict with error info
        """
        self._invalid_reading_callbacks.append(callback)

    def get_current_reading(self) -> PWMReading:
        """
        Get the most recent PWM reading.

        Returns:
            Copy of current PWMReading

        Raises:
            RuntimeError: If reader is not running
        """
        if not self.is_running:
            raise RuntimeError("PWM Reader is not running. Call start() first")

        return PWMReading(
            duty_cycle=self.current_reading.duty_cycle,
            frequency=self.current_reading.frequency
        )

    def get_duty_cycle(self) -> float:
        """Get current duty cycle (convenience method)."""
        return self.get_current_reading().duty_cycle

    def get_frequency(self) -> float:
        """Get current frequency (convenience method)."""
        return self.get_current_reading().frequency

    def get_statistics(self) -> Dict[str, Any]:
        """
        Get statistics about signal quality.

        Returns:
            Dictionary with statistics
        """
        success_rate = 0.0
        if self.total_readings > 0:
            success_rate = (self.valid_readings / self.total_readings) * 100

        return {
            'total_readings': self.total_readings,
            'valid_readings': self.valid_readings,
            'success_rate': success_rate,
            'is_running': self.is_running,
            'pin': self.pin
        }

    def reset_statistics(self) -> None:
        """Reset statistics counters."""
        self.valid_readings = 0
        self.total_readings = 0

    def is_active(self) -> bool:
        """Check if the reader is currently running."""
        return self.is_running

    @property
    def duty_cycle(self) -> float:
        return self.current_reading.duty_cycle


log = configure_logger(PWMReader.__name__)


# Example usage
if __name__ == "__main__":
    import time
    # Create a reader for GPIO 17, expecting 490 Hz PWM
    reader = PWMReader(pin=17, expected_frequency=490)


    # # Define callback for readings
    # def print_reading(reading: PWMReading):
    #     print(f"Duty: {reading.duty_cycle:.1f}%, Freq: {reading.frequency:.1f} Hz")
    #
    #
    # reader.on_reading(print_reading)

    try:
        log.info("Reading PWM signal... Press Ctrl+C to stop")

        # # Run for 10 seconds
        # time.sleep(10)

        # Print statistics
        # stats = reader.get_statistics()
        # print(f"\nStatistics: {stats}")

        while True:
            log.info(reader.duty_cycle)
            time.sleep(0.2)

    except KeyboardInterrupt:
        log.warning("\nStopping...")
    finally:
        reader.stop()

