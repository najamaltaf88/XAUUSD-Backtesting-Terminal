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

One-click trading performs placing, modifying, canceling, and closing actions immediately. Documented entry paths include Buy/Sell buttons, price-scale menus, chart context menus, and keyboard shortcuts. This app makes the immediate chart Quick BUY/SELL behavior explicit; optional SL/TP brackets are added afterward through the chart or active-trade fields.

## Implementation implications

The repair should add a persistent chart-level BUY/SELL action bar that uses the replay cursor price. After a market order is placed, an entry line and optional opposing SL/TP lines should be visible together. Dragging a bracket line should update the parent position, save the new price, recalculate risk/P&L, and preserve the bracket side relationship.

## Chart BUY/SELL and position-line references

Source: https://www.tradingview.com/support/solutions/43000479981-how-to-show-buy-sell-buttons-on-the-chart/

TradingView exposes Buy/Sell buttons directly on the chart through chart settings. The visual reference places compact colored SELL and BUY buttons in the chart’s upper-left area, near the quantity selector, rather than only inside a side order ticket.

Source: https://www.tradingview.com/support/solutions/43000475660-how-to-use-long-and-short-position-drawing-tools/

TradingView’s position visualization keeps entry, stop, and target levels together and displays quantity, risk/reward, price offsets, and P&L. The target and stop are opposite sides of the entry for long and short positions, and their tags are attached to the horizontal levels for direct chart editing.

Source: https://www.tradingview.com/support/solutions/43000480920-i-d-like-to-place-orders-without-having-to-confirm-them-every-time/

One-click mode executes order-related actions immediately. In this app, Quick BUY/SELL therefore must not require SL/TP fields or a confirmation dialog by default; SL/TP should be optional chart-managed brackets that can be added after the position exists.

## Replay switching and dollar-valued position labels

TradingView’s official long/short position documentation says chart tags should expose entry, stop, target, quantity, price offsets, P&L, and risk/reward. For a long position, target P&L is `(TP - Entry) × quantity × point value × lot size`, while stop P&L is `(SL - Entry) × quantity × point value × lot size`; short positions reverse the price differences. This app maps the same idea to its XAUUSD model with `pnl()` and displays both dollar outcome and point/pip distance.

TradingView’s bracket documentation states that a position may have a stop-loss or take-profit independently, and that users can add or modify position brackets after entry. The app therefore keeps Quick BUY/SELL unbracketed initially and treats the chart’s ADD SL / ADD TP guides as optional price-anchored bracket controls.

TradingView’s price-scale documentation defines the price scale as the mapping between price values and chart coordinates. The overlay must therefore recompute Y coordinates with `series.priceToCoordinate(level)` whenever the chart is rendered or resized, rather than storing screen Y positions.

## Reliable bracket drag behavior

TradingView’s official bracket guidance says an open position without brackets can be protected afterward, and its chart-bracket workflow lets users pull SL or TP to the desired price level. Bracket levels can be added or modified independently, and the platform updates position state after bracket changes. The app should therefore use dedicated, wide drag handles for each bracket, keep text labels pointer-transparent, update the parent position on pointer release, and redraw from the current price-to-coordinate mapping after every move.

Sources:
- https://www.tradingview.com/support/solutions/43000754962-add-brackets-to-the-existing-position/
- https://www.tradingview.com/support/solutions/43000754961-positions-brackets-modification/
- https://www.tradingview.com/blog/en/brackets-from-the-chart-28634/
