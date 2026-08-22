# Backtesting and replay documentation notes

## TradingView Bar Replay
Source: https://www.tradingview.com/support/solutions/43000712747-bar-replay-how-and-why-to-test-a-strategy-in-the-past/

TradingView describes Bar Replay as a historical simulation workflow for strategy testing. A user selects a historical bar/date as the starting point, can play at adjustable speed, advance manually one bar at a time, change the starting point, and jump back to real time. The replay session preserves the last viewed bar, symbols, intervals, and replay state so work can continue from the same place.

## TradingView bracket orders
Source: https://www.tradingview.com/charting-library-docs/latest/trading_terminal/trading-concepts/brackets/

A bracket protects a parent order or position with opposing stop-loss and take-profit orders. A buy position is protected by sell-side exit orders; a sell position is protected by buy-side exit orders. Brackets may be paired or independent. Limit and stop entries carry their corresponding requested entry price, while stop-loss and take-profit remain attached to the parent position.

## Implications for this app

The chart must keep a complete historical dataset separate from the visible replay slice. Replay controls should mutate only the cursor and visible slice, preserving the future bars for later steps. Timeframe changes must fetch fresh data rather than reuse a stale dataset. Market/pending orders should be represented with explicit status and requested price, and bracket edits must update the parent position and chart overlays together. A session restore must preserve the cursor and replay state, not merely reload the latest candle.

## Chart trading and one-click controls
Source: https://www.tradingview.com/support/solutions/43000756695-how-to-trade-on-tradingview/

TradingView documents several order-entry paths, including the order ticket, chart trading, and shortcuts. For a chart-first simulator, BUY/SELL actions should be available at the chart level and use the current chart context.

Source: https://www.tradingview.com/support/solutions/43000480920-i-d-like-to-place-orders-without-having-to-confirm-them-every-time/

One-click trading performs placing, modifying, canceling, and closing actions immediately. Documented entry paths include Buy/Sell buttons, price-scale menus, chart context menus, and keyboard shortcuts. The UI should make one-click mode visible and provide a confirmation option because a click immediately changes order state.

## Implementation implications

The repair should add a persistent chart-level BUY/SELL action bar that uses the replay cursor price. After a market order is placed, an entry line and optional opposing SL/TP lines should be visible together. Dragging a bracket line should update the parent position, save the new price, recalculate risk/P&L, and preserve the bracket side relationship.
