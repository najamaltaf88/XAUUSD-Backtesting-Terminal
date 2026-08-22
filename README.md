# XAU/USD Backtesting Lab

A standalone dark-theme **historical replay and manual backtesting terminal** built with plain HTML, CSS, and JavaScript. It is a historical research tool, not a live-trading system. Future candles remain hidden until the replay cursor reaches them, and all orders are evaluated by the same deterministic historical-bar engine.

## Run locally

Serve the repository with a static web server, then open the site in a browser. A server is recommended because browser security can block `fetch()` from `file://` pages. No API key is committed to this repository.

## Data sources and provenance

The preferred source is user-supplied Twelve Data history for `XAU/USD`. The key is stored only in the browser’s local storage. Twelve Data requests are date-ranged and chunked, then normalized, merged, sorted, deduplicated, and validated before replay.

If exact spot history is unavailable, the application does **not** silently relabel a futures proxy as XAU/USD. The user must explicitly enable **Allow offline Gold Futures (GC=F) proxy** in Settings. The chart then identifies the active source as `Gold Futures (GC=F)`/offline proxy. Without an exact source or explicit proxy consent, the application shows a no-data state.

Offline bundles are real Yahoo Finance gold futures (`GC=F`) proxy data. They are supplied separately for M1, M5, M15, M30, H1, H4, and D1 and are checked by `scripts/validate_bundles.py`. The app does not generate synthetic candles and does not use the former fake Metals-API OHLC transformation.

## Replay workflow

Choose a historical date or use the replay controls to start a session. Only candles up to the cursor are visible. Forward stepping, slider movement, play mode, and session jumps all call the authoritative `processHistoricalBar(bar)` engine. Backward movement restores a per-cursor checkpoint containing positions, pending orders, closed trades, balance, equity, P&L, commissions, drawdown, and replay events.

Switching timeframe preserves the historical cursor date and nearest price context. Session save/load also stores the provider, symbol, timeframe, dataset identity, coverage, cursor, replay settings, account state, orders, trades, checkpoints, and drawings. A saved state is not silently restored against a different dataset.

## Execution model

The configured XAU/USD instrument is represented explicitly as a 100-ounce contract with a 0.01 tick size, $1 tick value per lot, 0.01 minimum lot, 100-lot maximum, and 0.01 lot step. These assumptions are visible in code and can be revised if a broker-specific contract is required.

For a candle midpoint, the simplified historical model uses `Ask = mid + spread/2` and `Bid = mid - spread/2`. BUY entries use Ask, SELL entries use Bid, BUY exits use Bid, and SELL exits use Ask. Positive slippage worsens the executed side deterministically; no random slippage is generated. This model is applied consistently to market orders, pending fills, manual closes, SL, and TP execution.

The supported order types are Market, Buy Limit, Sell Limit, Buy Stop, Sell Stop, manual close, partial close, SL, TP, and pending cancellation. Pending cancellations remove the order and create no completed trade, P&L, or commission. Commission is one-side commission per lot: entry commission is charged at entry, exit commission on closed quantity, and partial-close entry commission is allocated proportionally.

## Quick orders, brackets, and risk

Chart and sidebar Quick BUY/SELL use the same order-placement engine as the normal ticket. They execute immediately at the replay bar using the configured spread, slippage, quantity, and commission assumptions. They begin without attached SL/TP; brackets can be added through the active-order fields or by dragging the optional chart levels.

Risk sizing uses the session’s initial balance, risk percentage, entry, SL distance, contract size, point size, spread, expected slippage, and commission. If the calculated quantity is below the minimum lot, the application warns that actual risk will exceed requested risk.

## Intrabar limitation

OHLC candles do not reveal the exact order in which high and low were touched. The default configurable policy is **conservative**: if both SL and TP are touched in one candle, SL is assumed first. This is an explicit approximation and should not be interpreted as tick-accurate execution.

## Analytics and export

The report is rebuilt from authoritative trade and equity data and includes net P&L, win rate, profit factor, expectancy, average R, max drawdown amount and percentage, streaks, long/short results, equity curve, session performance, and a detailed journal. Journal records include trade and order identifiers, symbol, provider, timeframe, requested and actual prices, quantity, spread, slippage, entry/exit commission, gross and net P&L, R multiple, result, exit reason, entry session, and exit session. CSV export includes these fields. Chart screenshots composite the base chart with custom drawings and trade overlays.

Session labels use timezone-aware `Intl.DateTimeFormat` calculations for Asia, London, and New York rather than fixed UTC blocks. Entry and exit sessions are stored separately, and Next Session follows the configured session order.

## Validation

Run:

```bash
node --check terminal.js
python3 scripts/validate_bundles.py
```

The repository includes complete-dataset checks for timestamp ordering, duplicates, OHLC consistency, invalid numeric values, suspicious gaps, timeframe interval, source identity, coverage start, coverage end, and candle count.
