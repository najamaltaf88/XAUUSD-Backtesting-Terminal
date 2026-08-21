# XAUUSD Backtesting Lab

A standalone dark-theme **historical replay and manual backtesting application** built with plain HTML, CSS, and JavaScript. This is not a live-trading ticket. Future candles remain hidden until the replay cursor reaches them, and every order is evaluated against subsequent historical bars.

The app uses TradingView Lightweight Charts, requests free historical XAUUSD data from Yahoo Finance, and switches clearly to a deterministic historical demo dataset when the browser blocks the free endpoint.

## Run locally

Open `index.html` directly in a browser, or serve the folder with any static web server. No backend, database, paid API key, or build step is required.

## Backtesting workflow

Choose a historical session, then use play/pause, single-candle backward and forward, next-session jump, random start, adjustable speed, and jump-to-end controls. Orders can be placed while replay is paused as market, limit, or stop entries with BUY/SELL direction, lot size, SL, TP, spread, slippage, commission, and a setup note. Pending orders fill only when later candles reach their price. A conservative same-candle rule assumes SL is hit before TP when both are touched.

The report includes net P&L, return, win rate, profit factor, maximum drawdown, expectancy, average R, best and worst trade, streaks, long/short breakdown, equity curve, and a detailed trade log. Completed trades can be exported as CSV. Replay state, orders, trades, assumptions, and drawings persist in localStorage.

The research notes and product specification are included in `research-notes.md` and `backtest-spec.md`.
