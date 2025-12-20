# Changelog

## [Unreleased]

### Todo
- Sampler
  - Calibrate ADS readings.
  - Add an ADS connection recovery mechanism as loose cables cuts communication.
- v2: Support for mqtt protocol. Dashboard creation with json sent via mqtt.
- v3: Dynamic dashboard tabs creation for every mqtt client connected
- improve the SSE clients algorithm

### Fixed:
- Time drift compensation, export api now takes offset time in milliseconds relative to the current system date.
- DB cleanup each time the sampler is started.

## [113a298]
### Added:
- More optimizations on DB.
- ReadMe
### Fixed:
- PWM max/min level reading.
- Graceful sampler shutdown.
- Installation script creates env from scratch, Hotspot configuration so no manual post configuration needed (Open Hotspot, SSID: Tanques Interconectados, port redirection to 80, removed lighttpd captive portal).

## [11c0d44]
### Added
- Svelte Frontend:
  - Static page with SSE connection
  - Export initial Time habilitated
- Hotspot with RaspAp
- Redirection with Hostapd
- Installation script
### Modified
- Bun Server:
  -Modified export API to enhanced file naming.

## [7067c7d]
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


## [f2ee4e9]
- ADS readings lasts 195ms (16 sps so 62.5ms per channel. If less period desired then this parameter needs to be increased.)
- DB writings lasts 5ms (with peaks of 17ms).
- Total sampling minimum period: 200ms -> 5Hz. Still will work at 1 Hz as it consumes more cpu.
- Automatic cleanup with sampler --cleanup (every 1 month by default, checking every sunday at 3 am) 
- .env template (.env.template)
- logger integrated (logs at /var/lib/wlas/sampler.log by default).

