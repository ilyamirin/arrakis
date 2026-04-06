# Amber Dunes Harvest

Retro-futurist desert game with AI-generated code, art, music, copy, and interface. You guide a `Collector` across an `8x8` grid in `The Amber Waste`, gather all `amber`, and survive `Sinkjaw` strikes. Sound effects use CC0 assets from OpenGameArt.

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

- board size: `8x8`
- win condition: collect all `20` amber
- `Sinkjaw` threat radius: `4`
- direct `Sinkjaw` strike unlock: after move `3`

`Sinkjaw` now uses a split model:

- normal spawns stay in the local threat radius around the `Collector`
- direct strikes are no longer taken from the ordinary spawn pool
- instead, the instant-kill chance grows exponentially with move count

The direct strike chance is:

```text
p(move) = 1 - exp(-0.005252185473469883 * exp((move - 4) / 10))
```

That calibration was chosen so that cumulative death-by-`30` from direct `Sinkjaw` strikes is about `50%`.

### Direct strike calibration

Monte Carlo check on the current formula:

- runs: `200000`
- death by move `30`: `50.141%`
- survival by move `30`: `49.859%`

Per-move direct strike chance:

- move `4`: `0.52%`
- move `10`: `0.95%`
- move `20`: `2.57%`
- move `30`: `6.83%`

### Gameplay simulations

Quick heuristic runs on the current `8x8 / 20 amber` ruleset still show that overall victory is much rarer than simple survival to move `30`.

`3000` runs per strategy:

| Strategy | Collector win rate | Sinkjaw attack losses | Trap losses | Avg. moves | Avg. amber |
|---|---:|---:|---:|---:|---:|
| `amber_hunter` | `0.10%` | `99.90%` | `0.00%` | `29.25` | `9.97 / 20` |
| `avoid_repeats` | `5.73%` | `94.27%` | `0.00%` | `29.06` | `14.76 / 20` |
| `lookahead_1step` | `0.20%` | `99.80%` | `0.00%` | `29.16` | `9.75 / 20` |

### Takeaway

The `Sinkjaw` attack curve is now calibrated to a readable exponential ramp instead of a dirty random one-shot from the generic spawn pool. That fixes the worst fairness issue.

It does **not** mean the game is now `50%` winnable by move `30`. On the current objective (`20 amber` on `8x8`), the run goal itself is still much harder than the calibrated survival target. If overall win rate needs to move toward `50%`, the next balancing lever should be the objective pace: `TOTAL_AMBER`, board size, or route pressure, not a harsher `Sinkjaw`.

## License

MIT for the game code and original project assets. See [LICENSE](LICENSE). Third-party audio provenance and licensing are documented in [THIRD_PARTY_AUDIO.md](THIRD_PARTY_AUDIO.md).
