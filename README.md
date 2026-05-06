# Amber Dunes Harvest

Retro-futurist desert game with AI-generated code, art, music, copy, and interface. You guide a `Collector` across a `6x6` grid in `The Amber Waste`, gather all `amber`, and survive `Sinkjaw` strikes. Sound effects use CC0 assets from OpenGameArt.

## Run locally

```bash
npm run build
python3 server.py
```

Open [http://127.0.0.1:8000](http://127.0.0.1:8000) or your LAN URL from `server.py`.

## Yandex SDK and ads

- The production archive uses the Yandex SDK from the relative path `/sdk.js`.
- Local Yandex SDK testing is supported on:
  - `localhost`
  - `127.0.0.1`
  - real Yandex Games hosts
- The current monetization flow is intentionally simple:
  - only `interstitial` ads are enabled
  - the ad is shown automatically once when a run ends
  - this applies to both `won` and `lost` outcomes
  - `rewarded` ads are not used

### Local Yandex dev-mode check

Recommended desktop flow:

```bash
npx @yandex-games/sdk-dev-proxy -p /ABS/PATH/TO/arrakis --dev-mode=true --port 8080
```

Then open:

- [https://localhost:8080](https://localhost:8080)

Notes:

- `sdk-dev-proxy` is useful for desktop SDK callback checks.
- The proxy is tied to `localhost`, so its mock ad windows are not suitable for direct phone testing over LAN.
- For phone UI checks, use the normal local server instead of the Yandex proxy.

## Live balance

The current live rules are:

- board size: `6x6`
- start deposits: `20` amber
- win condition: collect all `20` amber
- `Sinkjaw` threat radius: `4`
- direct `Sinkjaw` strike unlock: after move `3`

`Sinkjaw` now uses a split model:

- normal spawns stay in the local threat radius around the `Collector`
- direct strikes are no longer taken from the ordinary spawn pool
- instead, the instant-kill chance grows exponentially with move count

The direct strike chance is:

```text
p(move) = 1 - exp(-0.0064 * exp((move - 4) / 10))
```

That calibration is paired with the denser `6x6 / 20 amber` board so a route-focused heuristic player wins about half of runs, with winning runs landing in the `25-30` move band.

### Direct strike calibration

Monte Carlo check on the current direct-strike formula:

- runs: `200000`
- death by move `30`: `57.028%`
- survival by move `30`: `42.972%`

Per-move direct strike chance:

- move `4`: `0.64%`
- move `10`: `1.16%`
- move `20`: `3.12%`
- move `30`: `8.26%`

### Gameplay simulations

Quick heuristic runs on the current `6x6 / 20 amber` ruleset target an overall win rate near `50%`.

`4000` deterministic runs for the balance check:

| Strategy | Collector win rate | Sinkjaw attack losses | Avg. winning moves |
|---|---:|---:|---:|
| `route_heuristic` | `~50%` | `~50%` | `25-30` |

### Takeaway

The `Sinkjaw` attack curve remains a readable exponential ramp instead of a dirty random one-shot from the generic spawn pool. The current objective pace is tuned so a player who plans a compact route can plausibly clear all 20 deposits around half of the time before the late-run danger takes over.

## License

MIT for the game code and original project assets. See [LICENSE](LICENSE). Third-party audio provenance and licensing are documented in [THIRD_PARTY_AUDIO.md](THIRD_PARTY_AUDIO.md).
