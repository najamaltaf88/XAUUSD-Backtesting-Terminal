# Backtesting and replay documentation notes

## TradingView Bar Replay
Source: https://www.tradingview.com/support/solutions/43000712747-bar-replay-how-and-why-to-test-a-strategy-in-the-past/

TradingView describes Bar Replay as a historical simulation workflow for strategy testing. A user selects a historical bar/date as the starting point, can play at adjustable speed, advance manually one bar at a time, change the starting point, and jump back to real time. The replay session preserves the last viewed bar, symbols, intervals, and replay state so work can continue from the same place.

## TradingView bracket orders
Source: https://www.tradingview.com/charting-library-docs/latest/trading_terminal/trading-concepts/brackets/

A bracket protects a parent order or position with opposing stop-loss and take-profit orders. A buy position is protected by sell-side exit orders; a sell position is protected by buy-side exit orders. Brackets may be paired or independent. Limit and stop entries carry their corresponding requested entry price, while stop-loss and take-profit remain attached to the parent position.

## Implications for this app

The chart must keep a complete historical dataset separate from the visible replay slice. Replay controls should mutate only the cursor and visible slice, preserving the future bars for later steps. Timeframe changes must fetch fresh data rather than reuse a stale dataset. Market/pending orders should be represented with explicit status and requested price, and bracket edits must update the parent position and chart overlays together. A session restore must preserve the cursor and replay state, not merely reload the latest candle.
