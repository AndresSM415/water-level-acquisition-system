import asyncio
from sensors import ADS1115, PWMReader, YFS401


class Sampler:
    def __init__(self):
        self.tank = ADS1115()
        self.flow_meter = {
            0: YFS401(11),
            1: YFS401(12),
        }
        self.hose = {
            0: PWMReader(13, 490),
            1: PWMReader(14, 490),
        }

        self.tasks = [
            asyncio.create_task(self.flow_meter[0].run_calculation_loop()),
            asyncio.create_task(self.flow_meter[1].run_calculation_loop()),
            asyncio.create_task(self.printValues())
        ]

    async def printValues(self) -> None:
        print(
            f"tank1: {self.tank.voltage(0)}, "
            f"tank2: {self.tank.voltage(1)}, "
            f"tank3: {self.tank.voltage(2)}, "
            f"flow1: {self.flow_meter[0].current_reading.liters_per_second}, "
            f"flow2: {self.flow_meter[1].current_reading.liters_per_second}, "
            f"hose1: {self.hose[0].current_reading.duty_cycle}, "
            f"hose2: {self.hose[1].current_reading.duty_cycle} "
        )

    async def main(self):
        try:
            await asyncio.gather(*self.tasks, return_exceptions=True)
        except asyncio.CancelledError or KeyboardInterrupt:
            print("\nStopping...")
            self.hose[0].stop()
            self.hose[1].stop()


if __name__ == "__main__":
    sampler = Sampler()
    asyncio.run(sampler.main())




