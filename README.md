# XAUUSD Backtesting Terminal

A standalone dark-theme XAUUSD paper-trading and backtesting terminal built with plain HTML, CSS, and JavaScript. The app uses TradingView Lightweight Charts, attempts to load historical and current XAUUSD data from Yahoo Finance, and falls back to a local demo feed when the free endpoint is unavailable.

## Run locally

Open `index.html` directly in a browser, or serve the folder with any static web server. No backend, database, paid API key, or build step is required.

## Included features

The terminal includes M1, M5, M15, M30, H1, H4, and D1 chart timeframes; crosshair readouts; zoom and scroll; horizontal lines; trend lines; rectangles; Fibonacci retracement levels; price-distance and risk/reward measurements; localStorage persistence; BUY and SELL paper orders; live floating P&L; automatic SL/TP closing; account settings; and a persistent trade history ledger with win rate, total P&L, and total trade statistics.

All application files are intentionally kept at the repository root so the project can be opened directly without a framework or deployment service.
