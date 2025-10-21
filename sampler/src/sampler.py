"""
Orchestrator for coordinated sensor data collection and DB insertion.

Architecture:
    - Sensors handle their own data collection (hardware interrupts and internal loops)
    - Sampler just reads the current state and inserts to DB at a fixed interval
    - Single loop = simple and efficient
"""
import asyncio
import argparse
from datetime import datetime, time as dtime
from time import time
from typing import Dict, List
from dataclasses import dataclass, asdict

from src.config import Config, configure_logger
Config.load_env_file()
from src.sensors import ADS1115, PWMReader, YFS401
from src.db import Database, cleanup_old_data


@dataclass
class SampleData:
    """Complete sample snapshot for DB insertion"""
    timestamp: float
    # Tank levels (voltage)
    tank1_voltage: float
    tank2_voltage: float
    tank3_voltage: float
    # Flow meters (L/s)
    flow1_lps: float
    flow1_pulses: int
    flow2_lps: float
    flow2_pulses: int
    # Hoses (duty cycle %)
    hose1_duty_cycle: float
    hose2_duty_cycle: float

    def to_dict(self) -> Dict:
        """Convert to dict for ORM/DB"""
        return asdict(self)


class Sampler:
    """
    Main orchestrator for sensor data collection and persistence.

    This class:
    - Initializes all sensors (hardware starts immediately)
    - Inserts samples to a database periodically
    - Handles graceful shutdown

    Usage:
        sampler = Sampler(db_interval=0.5) # Save to DB every 0.5 seconds
        await sampler.run()
    """
    def __init__(self):
        """
        Initialize sampler and all sensors.
        """
        log.info("Initializing DB...")
        self.db = Database()

        log.info("Initializing sensors...")
        try:
            self.tank = ADS1115()
            self.flow_meters: Dict[int, YFS401] = {
                0: YFS401(10),
                1: YFS401(9),
            }
            self.hoses: Dict[int, PWMReader] = {
                0: PWMReader(17, 490),
                1: PWMReader(27, 490),
            }

            # Task tracking
            self._tasks: List[asyncio.Task] = []
            self._is_running = False
            self._tick_event = None

            self.sample_interval = Config.SAMPLE_INTERVAL
        except Exception as e:
            log.error(f"Error initializing sensors: {e}")
            raise
        log.info("Sensors initialized and running.")

    def _collect_sample(self) -> SampleData:
        """
        Collect readings from all sensors and create a sample.
        :return: SampleData with all current readings.
        """
        return SampleData(
            timestamp=time(),
            tank1_voltage= self.tank.voltage(0),
            tank2_voltage= self.tank.voltage(1),
            tank3_voltage= self.tank.voltage(2),
            flow1_lps= self.flow_meters[0].current_reading.liters_per_second,
            flow1_pulses= self.flow_meters[0].current_reading.pulses,
            flow2_lps= self.flow_meters[1].current_reading.liters_per_second,
            flow2_pulses= self.flow_meters[1].current_reading.pulses,
            hose1_duty_cycle= self.hoses[0].current_reading.duty_cycle,
            hose2_duty_cycle= self.hoses[1].current_reading.duty_cycle
        )

    async def _insert_to_db(self, sample: SampleData) -> None:
        """
        Insert a sample to DB.
        :param sample: Sample to insert.
        """
        try:
            await self.db.insert_sample(sample.to_dict())
            log.info(
                "[%s] Tanks: %.2fV, %.2fV, %.2fV | Flow: %.3f L/s, %.3f L/s | Hose: %.1f%%, %.1f%%",
                datetime.fromtimestamp(sample.timestamp).strftime('%H:%M:%S.%f')[:-3],
                sample.tank1_voltage,
                sample.tank2_voltage,
                sample.tank3_voltage,
                sample.flow1_lps,
                sample.flow2_lps,
                sample.hose1_duty_cycle,
                sample.hose2_duty_cycle
            )
        except Exception as e:
            log.error(f"Error inserting to DB: {e}")

    async def _main_loop(self) -> None:
        """
        Main loop - collect sensor data and insert to DB at regular intervals.
        """
        try:
            while self._is_running:
                await self._tick_event.wait()

                t1 = time()
                sample = self._collect_sample()
                t2 = time()
                await self._insert_to_db(sample)
                t3 = time()
                print(f"sensors: {int((t2-t1)*1000)}, db: {int((t3-t2)*1000)}, total: {int((t3-t1)*1000)}")
                self._tick_event.clear()
        except asyncio.CancelledError:
            log.info("Main loop cancelled.")
            raise

    async def run(self) -> None:
        """
        Main entry pint - starts all tasks and manages the lifecycle.
        """
        await self.db.init_db()

        self._is_running = True
        self._tick_event = asyncio.Event()

        log.info("=" * 60)
        log.info("Starting Water Level Acquisition System")
        log.info("=" * 60 + "\n")

        self._tasks = [
            asyncio.create_task(self._main_loop(), name="main"),
            asyncio.create_task(self.flow_meters[0].run_calculation_loop(), name="flow0"),
            asyncio.create_task(self.flow_meters[1].run_calculation_loop(), name="flow1"),
            asyncio.create_task(self.ticker(), name="ticker")
        ]

        try:
            await asyncio.gather(*self._tasks, return_exceptions=True)
        except KeyboardInterrupt:
            log.warning("\n\nShutdown requested...")
        finally:
            await self._cleanup()

    async def _cleanup(self) -> None:
        """Graceful shutdown - clean up all resources"""
        self._is_running = False
        for task in self._tasks:
            if not task.done():
                task.cancel()

        await asyncio.gather(*self._tasks, return_exceptions=True)

        log.info("Stopping sensors...")
        self.flow_meters[0].stop()
        self.flow_meters[1].stop()
        self.hoses[0].stop()
        self.hoses[1].stop()

        log.info("Closing database...")
        await self.db.close()

        log.info("Shutdown complete.")

    async def ticker(self) -> None:
        """Using Event for periodic triggers"""
        n = 0
        t0 = time()
        while self._is_running:
            deadline = t0 + n * self.sample_interval
            sleep_for = max(deadline - time(), 0.0)
            await asyncio.sleep(sleep_for)
            self._tick_event.set()
            n += 1
            if n > 40_000_000 and datetime.now().time() is dtime.min:
                # Clean n variable. Grows infinitely in a month it can grow till 32 bytes
                n = 0
                t0 = time()


log = configure_logger(Sampler.__name__)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--cleanup", action="store_true", help="Delete old records from DB.")
    args = parser.parse_args()

    if args.cleanup:
        asyncio.run(cleanup_old_data())
    else:
        sampler = Sampler()
        asyncio.run(sampler.run())
