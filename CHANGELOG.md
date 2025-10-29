# Changelog

## [Unreleased]

### Todo
- Calibrate ADS readings.
- Add an ADS connection recovery mechanism as loose cables cuts communication.
- Fix PWM max/min level reading. 
- Clean up exiting code exceptions.
- Add more aggresive pragma optimizations on db (busy_timeout = 5000, synchronous = OFF, cache_size = -2000000, temp_store = memory)

### Added
- bun server:
  - Export csv
  - Dashboard streaming connection
  - Server stats
  - Driizle orm
  - Hono
- Testing scripts:
  - dummmy bun sampler.
  - multiple stream clients.

### Modified
- sampler db query writing (it was not working).
- added more env variables.
- q

## [f2ee4e9]
- ADS readings lasts 195ms (16 sps so 62.5ms per channel. If less period desired then this parameter needs to be increased.)
- DB writings lasts 5ms (with peaks of 17ms).
- Total sampling minimum period: 200ms -> 5Hz. Still will work at 1 Hz as it consumes more cpu.
- Automatic cleanup with sampler --cleanup (every 1 month by default, checking every sunday at 3 am) 
- .env template (.env.template)
- logger integrated (logs at /var/lib/wlas/sampler.log by default).

