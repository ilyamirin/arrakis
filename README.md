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
- start deposits: `20` amber
- win condition: collect all `20` amber
- `Sinkjaw` threat radius: `4`
- direct `Sinkjaw` strike unlock: after move `3`

`Sinkjaw` now uses a split model:

- normal spawns stay in the local threat radius around the `Collector`
- direct strikes are no longer taken from the ordinary spawn pool
- instead, the instant-kill chance stays low through move `31`, then spikes

The direct strike chance is:

```text
p(move) = 0, if move <= 3
p(move) = 0.004, if 4 <= move < 32
p(move) = 0.85, if move >= 32
```

That calibration keeps the `8x8 / 20 amber` board and changes only the direct `Sinkjaw` strike chance by move number. The route-focused balance target is about half of runs won, with winning runs averaging in the `25-30` move band.

### Direct strike calibration

Monte Carlo check on the current direct-strike schedule:

- runs: `200000`
- death by move `30`: `10.248%`
- survival by move `30`: `89.752%`

Per-move direct strike chance:

- move `4`: `0.40%`
- move `10`: `0.40%`
- move `20`: `0.40%`
- move `30`: `0.40%`
- move `32`: `85.00%`

### Gameplay simulations

Quick heuristic runs on the current `8x8 / 20 amber` ruleset target an overall win rate near `50%`.

`4000` deterministic runs for the balance check:

| Strategy | Collector win rate | Sinkjaw attack losses | Avg. winning moves |
|---|---:|---:|---:|
| `route_heuristic` | `51.48%` | `48.52%` | `29.71` |

### Takeaway

The `Sinkjaw` attack schedule now gives the player a mostly clean route-planning window, then sharply punishes runs that have not finished by the low thirties. The board size and objective stay at the original `8x8 / 20 amber`.

## License

MIT for the game code and original project assets. See [LICENSE](LICENSE). Third-party audio provenance and licensing are documented in [THIRD_PARTY_AUDIO.md](THIRD_PARTY_AUDIO.md).
