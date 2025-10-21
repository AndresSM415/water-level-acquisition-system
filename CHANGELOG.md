# Changelog

## [Unreleased]

### Todo
- Calibrate ADS readings.
- Add an ADS connection recovery mechanism as loose cables cuts communication.
- Fix PWM max/min level reading. 
- Bun server
- Clean up exiting code exceptions.

### Added
- ADS readings lasts 195ms (16 sps so 62.5ms per channel. If less period desired then this parameter needs to be increased.)
- DB writings lasts 5ms (with peaks of 17ms).
- Total sampling minimum period: 200ms -> 5Hz. Still will work at 1 Hz as it consumes more cpu.
- Automatic cleanup with sampler --cleanup (every 1 month by default, checking every sunday at 3 am) 
- .env template (.env.template)
- logger integrated (logs at /var/lib/wlas/sampler.log by default).

