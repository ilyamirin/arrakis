# Amber Dunes Harvest

Retro-futurist desert game with AI-generated code, art, copy, and interface. You guide a `Collector` across an `8x8` grid in `The Amber Waste`, gather all `amber`, and survive `Sinkjaw` strikes. The soundtrack is original project audio, and the sound effects use CC0 assets from OpenGameArt.

## Run locally

```bash
npm run build
python3 server.py
```

Open [http://127.0.0.1:8000](http://127.0.0.1:8000) or your LAN URL from `server.py`.

## Simulation setup

The table below summarizes `10,000` simulated runs for each player strategy against the ordinary random Sinkjaw.

- Adaptive Sinkjaw memory was disabled.
- The board size was `9x9`.
- The win condition was full amber collection.
- The baseline hazard model was the default in-game random Sinkjaw spawn.

## Results

| Strategy | Collector win rate | Sinkjaw win rate | Sinkjaw attacks | Traps | Avg. moves | Avg. amber | Balance (Sinkjaw:Collector) |
|---|---:|---:|---:|---:|---:|---:|---:|
| `amber_hunter` | `0.20%` | `99.80%` | `99.80%` | `0.00%` | `78.32` | `11.32 / 25` | `9980:20` |
| `amber_hunter_avoid_repeats` | `54.38%` | `45.62%` | `45.62%` | `0.00%` | `38.20` | `19.87 / 25` | `4562:5438` |
| `amber_hunter_lookahead_1step` | `41.41%` | `58.59%` | `58.59%` | `0.00%` | `49.12` | `20.19 / 25` | `5859:4141` |
| `amber_hunter_anti_risk` | `0.00%` | `100.00%` | `100.00%` | `0.00%` | `78.90` | `10.80 / 25` | `10000:0` |

## Strategy guide

### `amber_hunter`

The simplest greedy policy.

- If a legal move lands on amber, it takes one of those moves immediately.
- Otherwise it chooses the move that gets closest to the nearest remaining amber.
- It does not care about repetition, future mobility, or positional safety.

This strategy performs very poorly against the default Sinkjaw because it keeps stretching games and repeatedly walks into high-risk routes.

### `amber_hunter_avoid_repeats`

Greedy amber collection with an in-run memory penalty.

- It still prioritizes immediate amber.
- Among otherwise similar moves it avoids cells it has already visited often in the same run.
- That shortens routes, reduces wasteful loops, and lowers exposure to random Sinkjaw attacks.

This was the strongest simulated strategy in the current balance run.

### `amber_hunter_lookahead_1step`

A slightly smarter planning policy with one move of lookahead.

- It values immediate amber.
- It rewards moves that leave more future mobility.
- It rewards moves that place the Collector near amber-rich follow-up options on the next knight jump.
- It still uses a greedy amber bias, but with a better short-term route forecast.

This strategy is materially better than pure greed, but still weaker than the repeat-avoidance policy in the current ruleset.

### `amber_hunter_anti_risk`

A safety-biased policy.

- It prefers positions that look structurally safer.
- It values centrality and mobility more heavily.
- It only keeps a lighter amber preference instead of all-out harvesting pressure.

In this ruleset that caution backfires. The strategy survives longer routes without actually finishing the board, so the random Sinkjaw eventually catches it every time.

## Takeaway

Under the current default random Sinkjaw rules, the best of the four tested heuristics was `amber_hunter_avoid_repeats`. The pure greedy route and the overly defensive route were both heavily punished. That suggests the live balance rewards efficient, low-loop harvesting more than either raw greed or passive caution.

## License

MIT for the game code and original project assets. See [LICENSE](LICENSE). Third-party audio provenance and licensing are documented in [THIRD_PARTY_AUDIO.md](THIRD_PARTY_AUDIO.md).
