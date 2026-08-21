# Backtesting research notes

## TradingView Bar Replay documentation

Source: https://www.tradingview.com/support/solutions/43000712747-bar-replay-how-and-why-to-test-a-strategy-in-the-past/

TradingView’s official Bar Replay workflow centers on selecting a historical starting bar, playing at adjustable speed, advancing one bar at a time, changing the starting point, and returning to real time. It also supports random-bar starts, replay state restoration, synchronized replay across multiple charts/timeframes, drawings as historical annotations, and keyboard shortcuts for play/pause and single-step forward.

## Reddit: Critical Replay & Backtesting Improvements Needed

Source: https://www.reddit.com/r/TradingView/comments/1pi30gt/critical_replay_backtesting_improvements_needed/

A trader-request thread highlights practical gaps: backward navigation, persistent simulated P&L and trade statistics throughout a replay session, a Go-To Session/day-open control to skip inactive hours, and single-candle forward/back controls. These are direct product requirements for a usable manual backtesting workflow rather than a paper-trading ticket.

## FX Replay public product page

Source: https://fxreplay.com/

FX Replay positions itself as a browser-based historical replay and practice platform rather than a broker. Its public page emphasizes replaying real historical price data, testing strategies, practicing execution, journaling, analytics, and sample-size visibility. It also explicitly describes simulated results as educational and subject to limitations such as liquidity and hindsight.

## TradesViz Forex backtesting page

Source: https://www.tradesviz.com/forex-backtesting-software/

TradesViz presents two complementary modes using the same historical data: automated indicator-strategy backtesting and manual bar-by-bar replay. Its public feature summary highlights market, limit, stop, and bracket orders with pip-based SL/TP, multi-chart support for four pairs simultaneously, and feeding results into a journal. The manual simulator is treated as a first-class workflow rather than a live order ticket.

## Reddit: Backtesting (Buy and Sell)

Source: https://www.reddit.com/r/TradingView/comments/zspfla/backtesting_buy_and_sell/

The discussion requests trading while replay is paused, pending limit and stop orders, explicit SL and target entry, hedging, resume across multiple days, resilient session persistence, statistics during and after replay, CSV export, multiple timeframes/assets, maximum drawdown and streak metrics, and realistic lower-timeframe data. These requests strongly distinguish a backtester from a live-style paper ticket.

## FX Replay realism article

Source: https://fxreplay.com/learn/why-fx-replay-is-the-most-realistic-trading-simulator

The article emphasizes market-relevant execution prices, realistic stop-loss and take-profit behavior, testable limit and stop orders under changing conditions, spreads, slippage, and execution speed. The rebuild should make these assumptions visible rather than implying fills are frictionless.
