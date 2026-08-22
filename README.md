# XAUUSD Backtesting Lab

A standalone dark-theme **historical replay and manual backtesting application** built with plain HTML, CSS, and JavaScript. This is not a live-trading ticket. Future candles remain hidden until the replay cursor reaches them, and every order is evaluated against subsequent historical bars.

The app uses TradingView Lightweight Charts, requests free historical XAUUSD data from Yahoo Finance, and switches clearly to a deterministic historical demo dataset when the browser blocks the free endpoint.

## Run locally

Open `index.html` directly in a browser, or serve the folder with any static web server. No backend, database, paid API key, or build step is required.

## Backtesting workflow

Choose a historical session, then use play/pause, single-candle backward and forward, next-session jump, random start, adjustable speed, and jump-to-end controls. Orders can be placed while replay is paused as market, limit, or stop entries with BUY/SELL direction, lot size, SL, TP, spread, slippage, commission, and a setup note. Pending orders fill only when later candles reach their price. A conservative same-candle rule assumes SL is hit before TP when both are touched.

The report includes net P&L, return, win rate, profit factor, maximum drawdown, expectancy, average R, best and worst trade, streaks, long/short breakdown, equity curve, and a detailed trade log. Completed trades can be exported as CSV. Replay state, orders, trades, assumptions, and drawings persist in localStorage.

The research notes and product specification are included in `research-notes.md` and `backtest-spec.md`.

## Data-provider configuration

The app supports Twelve Data as the primary provider when a user enters their own key in the settings drawer. The key is kept in that browser’s localStorage and is not embedded in the public repository. Without a local key, the app uses the free Yahoo Finance `GC=F` endpoint automatically, then falls back to a metals.live spot price plus deterministic historical OHLC data if the browser blocks both providers.

## Specification coverage

The current build includes one-click mode, a replay progress slider, go-to-start and go-to-date controls, 50× replay speed, volume toggling, current-price line, collapsible drawing toolbar, ray and extended-line annotations, text and arrow tools, price distance, RR ratio, range selector, optional SL/TP, draggable brackets, pending-order chart lines, named session snapshots, JSON export, PDF print workflow, sortable/filterable trade logs, time analytics, performance calendar, keyboard shortcuts, and responsive sidebar tabs.

## Replay date behavior

Fresh loads now request data through the current date, open on the latest available candle, and fit the chart to the last 100 bars. The replay date picker is capped to the current date and defaults to today. Selecting a historical date moves the cursor to the nearest available trading candle, hides all later bars, scrolls the chart to that point, stores the selection locally, and shows a replay-start toast. Explicitly continued sessions restore their saved cursor and show a session-restored message.
