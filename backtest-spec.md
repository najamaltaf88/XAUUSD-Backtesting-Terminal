# XAUUSD Backtesting Lab — product specification

## Product intent

This is a historical replay and manual backtesting application, not a live-style paper-trading ticket. The chart must hide future bars, let the user control the replay cursor, and only allow fills against the visible historical state and subsequent bars.

## Core replay workflow

The user selects XAUUSD and a timeframe, loads a historical dataset, chooses a replay start date or a random historical bar, and then advances one candle at a time or plays at an adjustable speed. The replay dock includes play/pause, single-step backward, single-step forward, jump to session, jump to end, reset session, and a visible cursor date. Trades and statistics persist through the entire session and across reloads.

## Manual execution model

Orders can be placed while replay is paused. The order ticket supports market, limit, and stop entries, BUY and SELL direction, lot size, entry price, stop loss, take profit, spread, slippage, and commission assumptions. Pending orders remain visible and fill only when a later historical bar reaches the requested price. Open positions mark entry, SL, and TP on the chart. Stop/target behavior uses a documented conservative same-bar rule: if both SL and TP are touched in one candle, the stop is assumed to be hit first.

## Backtest analytics

The results layer shows starting balance, ending balance, net P&L, return, win rate, profit factor, expectancy, maximum drawdown, average win, average loss, average R, best trade, worst trade, win/loss streaks, long/short breakdown, and trade count. An equity curve is plotted against the replay timeline. The trade ledger includes timestamp, direction, entry, exit, size, gross P&L, costs, net P&L, R multiple, exit reason, and setup notes. The ledger can be exported as CSV.

## Persistence and data

The current replay cursor, historical bars, settings, pending orders, open positions, drawings, completed trades, and analytics are stored in localStorage. The app first requests free Yahoo Finance chart data for XAUUSD=X. When the browser blocks that request, the UI clearly switches to a deterministic demo historical dataset rather than pretending it is live market data.

## Design direction

Keep the dense dark terminal aesthetic, but make the replay state unmistakable with a gold REPLAY badge, a fixed bottom replay dock, a green/red equity summary, and separate sections for replay controls, execution assumptions, order state, and results.
