(() => {
  'use strict';

  const STORAGE_KEY = 'aurum-terminal-state-v1';
  const DRAWING_KEY = 'aurum-terminal-drawings-v1';
  const TF = {
    '1m': { interval: '1m', range: '7d', label: 'M1' },
    '5m': { interval: '5m', range: '60d', label: 'M5' },
    '15m': { interval: '15m', range: '60d', label: 'M15' },
    '30m': { interval: '30m', range: '60d', label: 'M30' },
    '1h': { interval: '1h', range: '730d', label: 'H1' },
    '4h': { interval: '1h', range: '730d', label: 'H4' },
    '1d': { interval: '1d', range: '5y', label: 'D1' },
  };
  const COLORS = { green: '#40c78c', red: '#ed6f76', gold: '#d7a45b' };
  const $ = (id) => document.getElementById(id);
  const fmtPrice = (value) => Number.isFinite(Number(value)) ? Number(value).toFixed(2) : '—';
  const fmtMoney = (value, signed = false) => {
    const n = Number(value) || 0;
    const prefix = signed && n > 0 ? '+' : n < 0 ? '-' : '';
    return `${prefix}$${Math.abs(n).toFixed(2)}`;
  };
  const fmtDate = (value) => new Date(value).toLocaleString([], { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  const uid = (prefix = 'id') => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  const defaultState = { balance: 100, pointSize: 0.01, openTrades: [], history: [] };
  let state = loadState();
  let drawings = loadDrawings();
  let selectedSide = 'buy';
  let selectedTool = 'cursor';
  let pendingPoints = [];
  let contextDrawingId = null;
  let currentTf = '1h';
  let candles = [];
  let candleMap = new Map();
  let lastPrice = null;
  let previousClose = null;
  let chart;
  let candleSeries;
  let chartResizeObserver;
  let liveTimer;

  function loadState() {
    try { return { ...defaultState, ...(JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')) }; } catch (_) { return { ...defaultState }; }
  }
  function loadDrawings() {
    try { return JSON.parse(localStorage.getItem(DRAWING_KEY) || '[]'); } catch (_) { return []; }
  }
  function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  function saveDrawings() { localStorage.setItem(DRAWING_KEY, JSON.stringify(drawings)); }

  function toast(message, kind = '') {
    const item = document.createElement('div'); item.className = `toast ${kind}`; item.textContent = message;
    $('toastStack').appendChild(item); setTimeout(() => item.remove(), 3800);
  }

  function initChart() {
    if (!window.LightweightCharts) { toast('Chart library did not load. Refresh to retry.', 'error'); return; }
    chart = LightweightCharts.createChart($('chart'), {
      layout: { background: { color: '#0b1017' }, textColor: '#778397', fontFamily: 'DM Mono, monospace', fontSize: 10 },
      grid: { vertLines: { color: '#17202b' }, horzLines: { color: '#17202b' } },
      rightPriceScale: { borderColor: '#24303e', scaleMargins: { top: 0.08, bottom: 0.1 } },
      timeScale: { borderColor: '#24303e', timeVisible: true, secondsVisible: false, rightOffset: 5, barSpacing: 8, minBarSpacing: 3 },
      crosshair: { mode: LightweightCharts.CrosshairMode.Normal, vertLine: { color: '#6f7c8d', width: 1, style: 3, labelBackgroundColor: '#263344' }, horzLine: { color: '#6f7c8d', width: 1, style: 3, labelBackgroundColor: '#263344' } },
      handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: true },
      handleScale: { axisPressedMouseMove: true, mouseWheel: true, pinch: true },
    });
    candleSeries = chart.addCandlestickSeries({ upColor: COLORS.green, downColor: COLORS.red, borderUpColor: COLORS.green, borderDownColor: COLORS.red, wickUpColor: COLORS.green, wickDownColor: COLORS.red, priceFormat: { type: 'price', precision: 2, minMove: 0.01 } });
    chart.subscribeCrosshairMove(handleCrosshair);
    chartResizeObserver = new ResizeObserver(() => chart.applyOptions({ width: $('chart').clientWidth, height: $('chart').clientHeight }));
    chartResizeObserver.observe($('chart'));
    $('chartStage').addEventListener('click', handleChartClick);
    $('chartStage').addEventListener('contextmenu', handleStageContextMenu);
  }

  function handleCrosshair(param) {
    if (!param || !param.time || !param.point || !candleSeries) { $('crosshairReadout').textContent = 'Move crosshair over chart'; return; }
    const data = param.seriesData?.get(candleSeries);
    const price = data?.close || candleSeries.coordinateToPrice(param.point.y);
    const time = typeof param.time === 'number' ? new Date(param.time * 1000) : null;
    $('crosshairReadout').textContent = time ? `${time.toLocaleDateString([], { month: 'short', day: '2-digit' })} ${time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}  ·  ${fmtPrice(price)}` : `Price ${fmtPrice(price)}`;
  }

  async function fetchMarketData(tfKey) {
    const config = TF[tfKey];
    $('chartLoading').classList.remove('hidden');
    $('dataStatus').textContent = 'FETCHING DATA';
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/XAUUSD=X?interval=${config.interval}&range=${config.range}`;
    try {
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const json = await response.json();
      const result = json.chart?.result?.[0];
      const quote = result?.indicators?.quote?.[0];
      const source = (result?.timestamp || []).map((time, i) => ({ time, open: quote.open[i], high: quote.high[i], low: quote.low[i], close: quote.close[i] })).filter((row) => [row.open, row.high, row.low, row.close].every(Number.isFinite));
      if (source.length < 20) throw new Error('Insufficient market bars');
      candles = tfKey === '4h' ? aggregateCandles(source, 4 * 60 * 60) : source;
      renderMarketData(false);
      $('dataStatus').textContent = 'LIVE DATA';
    } catch (error) {
      candles = generateFallbackCandles(tfKey);
      renderMarketData(true);
      $('dataStatus').textContent = 'DEMO FALLBACK';
      toast('Yahoo Finance was unavailable, so a realistic local demo feed is active.', '');
    } finally {
      $('chartLoading').classList.add('hidden');
      $('lastUpdated').textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  }

  function aggregateCandles(source, bucketSeconds) {
    const grouped = new Map();
    source.forEach((row) => {
      const bucket = Math.floor(row.time / bucketSeconds) * bucketSeconds;
      const existing = grouped.get(bucket);
      if (!existing) grouped.set(bucket, { time: bucket, open: row.open, high: row.high, low: row.low, close: row.close });
      else { existing.high = Math.max(existing.high, row.high); existing.low = Math.min(existing.low, row.low); existing.close = row.close; }
    });
    return Array.from(grouped.values());
  }

  function generateFallbackCandles(tfKey) {
    const intervalSeconds = tfKey === '1d' ? 86400 : tfKey === '4h' ? 14400 : Math.max(60, Number(tfKey.replace('m', '')) * 60 || 3600);
    const count = tfKey === '1m' ? 460 : tfKey === '1d' ? 260 : 330;
    const now = Math.floor(Date.now() / 1000);
    let price = 3345.8 + Math.sin(now / 90000) * 28;
    const rows = [];
    for (let i = count; i >= 0; i--) {
      const time = Math.floor((now - i * intervalSeconds) / intervalSeconds) * intervalSeconds;
      const wave = Math.sin(i * .19) * 1.8 + Math.sin(i * .043) * 8 + Math.cos(i * .011) * 12;
      const open = price;
      const close = Math.max(2500, open + wave * .24 + (Math.random() - .5) * 2.2);
      const high = Math.max(open, close) + Math.abs(Math.sin(i * 1.3)) * 1.8 + Math.random() * 1.1;
      const low = Math.min(open, close) - Math.abs(Math.cos(i * .9)) * 1.6 - Math.random() * 1.1;
      rows.push({ time, open: Number(open.toFixed(2)), high: Number(high.toFixed(2)), low: Number(low.toFixed(2)), close: Number(close.toFixed(2)) });
      price = close;
    }
    return rows;
  }

  function renderMarketData(isFallback) {
    candleMap = new Map(candles.map((c) => [c.time, c]));
    candleSeries.setData(candles);
    chart.timeScale().fitContent();
    const current = candles[candles.length - 1];
    previousClose = candles[candles.length - 2]?.close ?? current.close;
    lastPrice = current.close;
    updateMarketHeader(current);
    redrawDrawings();
    updateAccountUI();
    if (isFallback) $('dataStatus').textContent = 'DEMO FALLBACK';
  }

  function updateMarketHeader(current) {
    if (!current) return;
    const change = current.close - (previousClose || current.open);
    $('topPrice').textContent = fmtPrice(current.close);
    $('topChange').textContent = `${change >= 0 ? '+' : ''}${change.toFixed(2)} (${((change / (previousClose || current.open)) * 100).toFixed(2)}%)`;
    $('topChange').className = change >= 0 ? 'positive' : 'negative';
    $('ticketPrice').textContent = fmtPrice(current.close);
    $('ohlcSummary').textContent = `O ${fmtPrice(current.open)}  ·  H ${fmtPrice(current.high)}  ·  L ${fmtPrice(current.low)}  ·  C ${fmtPrice(current.close)}`;
  }

  function tickMarket() {
    if (!candles.length || !candleSeries) return;
    const previous = candles[candles.length - 1];
    const drift = Math.sin(Date.now() / 47000) * .015 + (Math.random() - .5) * .08;
    const next = { ...previous, close: Number((previous.close + drift).toFixed(2)), high: Math.max(previous.high, Number((previous.close + drift).toFixed(2))), low: Math.min(previous.low, Number((previous.close + drift).toFixed(2))) };
    candles[candles.length - 1] = next; candleMap.set(next.time, next); lastPrice = next.close;
    candleSeries.update(next); updateMarketHeader(next); updateAccountUI(); checkStops(); redrawDrawings();
    $('lastUpdated').textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function getChartPoint(event) {
    const rect = $('chart').getBoundingClientRect();
    const x = clamp(event.clientX - rect.left, 0, rect.width);
    const y = clamp(event.clientY - rect.top, 0, rect.height);
    const time = chart.timeScale().coordinateToTime(x);
    const price = candleSeries.coordinateToPrice(y);
    if (!time || !Number.isFinite(price)) return null;
    return { time: typeof time === 'number' ? time : Math.round(time.timestamp), price: Number(price) };
  }

  function handleChartClick(event) {
    if (event.target.closest('.drawing-toolbar') || selectedTool === 'cursor') return;
    const point = getChartPoint(event); if (!point) return;
    pendingPoints.push(point);
    const needed = selectedTool === 'horizontal' ? 1 : selectedTool === 'rr' ? 3 : 2;
    if (pendingPoints.length >= needed) { completeDrawing(selectedTool, pendingPoints.slice(0, needed)); pendingPoints = []; selectTool('cursor'); }
    else toast(`${needed - pendingPoints.length} more point${needed - pendingPoints.length === 1 ? '' : 's'} to complete ${toolLabel(selectedTool)}.`);
  }

  function toolLabel(tool) { return ({ horizontal: 'horizontal line', trend: 'trend line', rectangle: 'rectangle', fibonacci: 'Fibonacci', distance: 'distance tool', rr: 'RR tool' }[tool] || tool); }
  function selectTool(tool) {
    selectedTool = tool; pendingPoints = [];
    document.querySelectorAll('.tool-button').forEach((button) => button.classList.toggle('active', button.dataset.tool === tool));
    $('chartStage').style.cursor = tool === 'cursor' ? 'default' : 'crosshair';
  }
  function completeDrawing(type, points) {
    const drawing = { id: uid('drawing'), type, points, createdAt: Date.now() };
    drawings.push(drawing); saveDrawings(); redrawDrawings();
    toast(`${toolLabel(type)} saved to this browser.`, 'success');
  }

  function coordFor(point) {
    const x = chart?.timeScale()?.timeToCoordinate(point.time);
    const y = candleSeries?.priceToCoordinate(point.price);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    return { x, y };
  }

  function redrawDrawings() {
    const svg = $('drawingOverlay'); if (!svg || !chart) return;
    const rect = $('chart').getBoundingClientRect(); svg.setAttribute('viewBox', `0 0 ${rect.width} ${rect.height}`); svg.innerHTML = '';
    drawings.forEach((drawing) => {
      const group = document.createElementNS('http://www.w3.org/2000/svg', 'g'); group.dataset.id = drawing.id;
      const coords = drawing.points.map(coordFor); if (coords.some((coord) => !coord)) return;
      if (drawing.type === 'horizontal') drawHorizontal(group, drawing, coords[0], rect);
      if (drawing.type === 'trend') drawTrend(group, drawing, coords[0], coords[1]);
      if (drawing.type === 'rectangle') drawRectangle(group, drawing, coords[0], coords[1]);
      if (drawing.type === 'fibonacci') drawFibonacci(group, drawing, coords[0], coords[1], rect);
      if (drawing.type === 'distance') drawDistance(group, drawing, coords[0], coords[1], rect);
      if (drawing.type === 'rr') drawRR(group, drawing, coords[0], coords[1], coords[2], rect);
      group.addEventListener('contextmenu', (event) => { event.preventDefault(); openDrawingMenu(drawing.id, event.clientX, event.clientY); });
      svg.appendChild(group);
    });
  }

  function svgLine(x1, y1, x2, y2, className = 'drawing-line') { const el = document.createElementNS('http://www.w3.org/2000/svg', 'line'); Object.assign(el.dataset, { x1, y1, x2, y2 }); el.setAttribute('x1', x1); el.setAttribute('y1', y1); el.setAttribute('x2', x2); el.setAttribute('y2', y2); el.setAttribute('class', className); return el; }
  function svgText(x, y, text, className = 'fib-label') { const el = document.createElementNS('http://www.w3.org/2000/svg', 'text'); el.setAttribute('x', x); el.setAttribute('y', y); el.setAttribute('class', className); el.textContent = text; return el; }
  function addHitLine(group, x1, y1, x2, y2) { const hit = svgLine(x1, y1, x2, y2, 'drawing-line'); hit.setAttribute('stroke', 'transparent'); hit.setAttribute('stroke-width', '14'); hit.style.pointerEvents = 'stroke'; group.appendChild(hit); }
  function drawHorizontal(group, drawing, point, rect) { group.appendChild(svgLine(0, point.y, rect.width, point.y, 'drawing-line solid')); addHitLine(group, 0, point.y, rect.width, point.y); group.appendChild(svgText(rect.width - 58, point.y - 5, fmtPrice(drawing.points[0].price))); }
  function drawTrend(group, drawing, a, b) { group.appendChild(svgLine(a.x, a.y, b.x, b.y, 'drawing-line solid')); addHitLine(group, a.x, a.y, b.x, b.y); }
  function drawRectangle(group, drawing, a, b) { const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y), w = Math.abs(a.x - b.x), h = Math.abs(a.y - b.y); const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect'); rect.setAttribute('x', x); rect.setAttribute('y', y); rect.setAttribute('width', w); rect.setAttribute('height', h); rect.setAttribute('class', 'drawing-box'); rect.style.pointerEvents = 'fill'; group.appendChild(rect); }
  function drawFibonacci(group, drawing, a, b, rect) { const start = drawing.points[0].price, end = drawing.points[1].price; const levels = [0, .236, .382, .5, .618, .786, 1]; levels.forEach((level) => { const price = start + (end - start) * level; const y = candleSeries.priceToCoordinate(price); if (!Number.isFinite(y)) return; group.appendChild(svgLine(Math.min(a.x, b.x), y, Math.max(a.x, b.x), y, 'fib-level')); group.appendChild(svgText(Math.max(a.x, b.x) + 5, y - 3, `${(level * 100).toFixed(1).replace('.0', '')}%  ${fmtPrice(price)}`)); }); addHitLine(group, a.x, a.y, b.x, b.y); }
  function drawDistance(group, drawing, a, b, rect) { const distance = Math.abs(drawing.points[1].price - drawing.points[0].price); const points = distance / Number(state.pointSize || .01); const dollars = distance * 100; group.appendChild(svgLine(a.x, a.y, b.x, b.y, 'drawing-line solid')); group.appendChild(svgLine(a.x, a.y, a.x, b.y, 'drawing-line')); group.appendChild(svgText(Math.max(a.x, b.x) + 6, (a.y + b.y) / 2, `${points.toFixed(0)} pt  ${fmtMoney(dollars)}/1L`, 'measure-label')); addHitLine(group, a.x, a.y, b.x, b.y); }
  function drawRR(group, drawing, entry, sl, tp, rect) { group.appendChild(svgLine(0, entry.y, rect.width, entry.y, 'drawing-line rr-entry')); group.appendChild(svgLine(0, sl.y, rect.width, sl.y, 'drawing-line rr-sl')); group.appendChild(svgLine(0, tp.y, rect.width, tp.y, 'drawing-line rr-tp')); const risk = Math.abs(drawing.points[0].price - drawing.points[1].price); const reward = Math.abs(drawing.points[2].price - drawing.points[0].price); const ratio = risk ? reward / risk : 0; group.appendChild(svgText(Math.max(entry.x, sl.x, tp.x) + 6, entry.y - 6, `ENTRY ${fmtPrice(drawing.points[0].price)}`, 'measure-label')); group.appendChild(svgText(Math.max(entry.x, sl.x, tp.x) + 6, sl.y - 6, `SL ${fmtPrice(drawing.points[1].price)}`, 'measure-label')); group.appendChild(svgText(Math.max(entry.x, sl.x, tp.x) + 6, tp.y - 6, `TP ${fmtPrice(drawing.points[2].price)}  ·  1 : ${ratio.toFixed(2)}`, 'measure-label')); [entry, sl, tp].forEach((point) => addHitLine(group, 0, point.y, rect.width, point.y)); }

  function handleStageContextMenu(event) { if (event.target.closest('.drawing-overlay')) return; $('contextMenu').hidden = true; }
  function openDrawingMenu(id, x, y) { contextDrawingId = id; const menu = $('contextMenu'); menu.hidden = false; menu.style.left = `${x}px`; menu.style.top = `${y}px`; }
  function deleteSelectedDrawing() { if (!contextDrawingId) return; drawings = drawings.filter((drawing) => drawing.id !== contextDrawingId); saveDrawings(); redrawDrawings(); $('contextMenu').hidden = true; contextDrawingId = null; toast('Drawing deleted.'); }

  function getFloatingPnl() { return state.openTrades.reduce((total, trade) => total + getTradePnl(trade), 0); }
  function getTradePnl(trade, price = lastPrice) { if (!Number.isFinite(price)) return 0; const delta = trade.direction === 'BUY' ? price - trade.entry : trade.entry - price; return delta * trade.lotSize * 100; }
  function getRR(trade, exit) { const risk = Math.abs(trade.entry - trade.sl); const reward = trade.direction === 'BUY' ? exit - trade.entry : trade.entry - exit; return risk > 0 ? reward / risk : 0; }
  function updateAccountUI() {
    const floating = getFloatingPnl(); const equity = Number(state.balance) + floating;
    $('balanceValue').textContent = fmtMoney(state.balance); $('equityValue').textContent = fmtMoney(equity); $('floatingValue').textContent = fmtMoney(floating, true); $('floatingValue').className = floating > 0 ? 'positive' : floating < 0 ? 'negative' : 'neutral';
    $('openCount').textContent = state.openTrades.length; renderOpenTrades(); renderHistoryStats();
    updateRiskHint();
  }
  function renderOpenTrades() {
    const container = $('openTrades');
    if (!state.openTrades.length) { container.innerHTML = '<div class="empty-state"><span class="empty-icon">＋</span><strong>No open trades</strong><span>Place a paper order to track it here.</span></div>'; return; }
    container.innerHTML = state.openTrades.map((trade) => { const pnl = getTradePnl(trade); return `<article class="trade-row ${trade.direction.toLowerCase()}"><div class="trade-row-top"><span class="direction ${trade.direction.toLowerCase()}">${trade.direction} · ${trade.lotSize.toFixed(2)} LOT</span><span class="trade-pnl ${pnl >= 0 ? 'positive' : 'negative'}">${fmtMoney(pnl, true)}</span></div><div class="trade-row-mid"><span>Entry ${fmtPrice(trade.entry)}</span><span>Now ${fmtPrice(lastPrice)}</span></div><div class="trade-row-mid"><span>SL ${fmtPrice(trade.sl)}</span><span>TP ${fmtPrice(trade.tp)}</span></div><button class="close-trade" data-close-id="${trade.id}">Close at market ${fmtPrice(lastPrice)}</button></article>`; }).join('');
  }
  function renderHistoryStats() {
    const history = state.history; const wins = history.filter((trade) => trade.pnl > 0).length; const pnl = history.reduce((sum, trade) => sum + trade.pnl, 0);
    $('winRate').textContent = history.length ? `${Math.round((wins / history.length) * 100)}%` : '—'; $('totalPnl').textContent = fmtMoney(pnl, true); $('totalPnl').className = pnl > 0 ? 'positive' : pnl < 0 ? 'negative' : ''; $('totalTrades').textContent = history.length;
    $('historyBody').innerHTML = history.length ? history.slice().reverse().map((trade) => `<tr><td>${fmtDate(trade.closedAt)}</td><td><strong>XAUUSD</strong></td><td class="direction-cell ${trade.direction.toLowerCase()}">${trade.direction}</td><td>${fmtPrice(trade.entry)}</td><td>${fmtPrice(trade.exit)}</td><td>${trade.lotSize.toFixed(2)}</td><td class="${trade.pnl >= 0 ? 'positive' : 'negative'}">${fmtMoney(trade.pnl, true)}</td><td>${trade.rr >= 0 ? '1 : ' + trade.rr.toFixed(2) : trade.rr.toFixed(2)}</td></tr>`).join('') : '<tr><td colspan="8" class="empty-table">No closed trades yet. Your completed orders will appear here.</td></tr>';
  }
  function updateRiskHint() {
    const slRaw = $('stopLoss').value, tpRaw = $('takeProfit').value; const sl = Number(slRaw), tp = Number(tpRaw), entry = lastPrice; const valid = entry && slRaw !== '' && tpRaw !== '' && Number.isFinite(sl) && Number.isFinite(tp);
    if (!valid) { $('riskHint').textContent = 'Set SL and TP to calculate risk before execution.'; $('riskHint').className = 'risk-hint'; return; }
    const risk = Math.abs(entry - sl), reward = Math.abs(tp - entry), ratio = risk ? reward / risk : 0; $('riskHint').textContent = `Risk ${risk.toFixed(2)} · Reward ${reward.toFixed(2)} · R:R 1 : ${ratio.toFixed(2)}`; $('riskHint').className = 'risk-hint valid';
  }
  function validateOrder() {
    const lot = Number($('lotSize').value), sl = Number($('stopLoss').value), tp = Number($('takeProfit').value);
    if (!Number.isFinite(lastPrice)) return 'Market price is still loading.';
    if (!lot || lot <= 0) return 'Enter a lot size greater than zero.';
    if (!Number.isFinite(sl) || !Number.isFinite(tp)) return 'Enter both a stop loss and take profit price.';
    if (selectedSide === 'buy' && !(sl < lastPrice && tp > lastPrice)) return 'For a BUY, SL must be below entry and TP above entry.';
    if (selectedSide === 'sell' && !(sl > lastPrice && tp < lastPrice)) return 'For a SELL, SL must be above entry and TP below entry.';
    return null;
  }
  function placeTrade() {
    const error = validateOrder(); if (error) { toast(error, 'error'); return; }
    const trade = { id: uid('trade'), direction: selectedSide === 'buy' ? 'BUY' : 'SELL', entry: lastPrice, sl: Number($('stopLoss').value), tp: Number($('takeProfit').value), lotSize: Number($('lotSize').value), openedAt: Date.now() };
    state.openTrades.push(trade); saveState(); updateAccountUI(); $('stopLoss').value = ''; $('takeProfit').value = ''; toast(`${trade.direction} XAUUSD ${trade.lotSize.toFixed(2)} lot opened at ${fmtPrice(trade.entry)}.`, 'success');
  }
  function closeTrade(id, reason = 'MANUAL') {
    const index = state.openTrades.findIndex((trade) => trade.id === id); if (index < 0) return; const trade = state.openTrades[index]; const exit = lastPrice; const pnl = getTradePnl(trade, exit);
    state.balance = Number(state.balance) + pnl; state.history.push({ ...trade, exit, pnl, rr: getRR(trade, exit), closedAt: Date.now(), closeReason: reason }); state.openTrades.splice(index, 1); saveState(); updateAccountUI(); toast(`${trade.direction} closed at ${fmtPrice(exit)} · ${fmtMoney(pnl, true)}`, pnl >= 0 ? 'success' : 'error');
  }
  function checkStops() {
    state.openTrades.slice().forEach((trade) => { const hit = trade.direction === 'BUY' ? (lastPrice <= trade.sl ? 'STOP LOSS' : lastPrice >= trade.tp ? 'TAKE PROFIT' : '') : (lastPrice >= trade.sl ? 'STOP LOSS' : lastPrice <= trade.tp ? 'TAKE PROFIT' : ''); if (hit) closeTrade(trade.id, hit); });
  }

  function selectSide(side) { selectedSide = side; $('buyTab').classList.toggle('active', side === 'buy'); $('sellTab').classList.toggle('active', side === 'sell'); const button = $('placeTrade'); button.className = `execute-button ${side === 'buy' ? 'buy-execute' : 'sell-execute'}`; button.innerHTML = `Place ${side} order <span>↗</span>`; updateRiskHint(); }
  function openSettings() { $('settingsBackdrop').hidden = false; requestAnimationFrame(() => $('settingsDrawer').classList.add('open')); $('settingsDrawer').setAttribute('aria-hidden', 'false'); }
  function closeSettings() { $('settingsDrawer').classList.remove('open'); $('settingsDrawer').setAttribute('aria-hidden', 'true'); setTimeout(() => { $('settingsBackdrop').hidden = true; }, 240); }
  function applyBalance() { const value = Number($('balanceInput').value); if (Number.isFinite(value) && value >= 0) { state.balance = value; saveState(); updateAccountUI(); toast('Paper balance updated.', 'success'); } }
  function clearWorkspace() { if (!window.confirm('Clear drawings, open trades, and trade history from this browser?')) return; state = { ...defaultState }; drawings = []; $('balanceInput').value = 100; $('pointValueInput').value = .01; saveState(); saveDrawings(); updateAccountUI(); redrawDrawings(); closeSettings(); toast('Local workspace cleared.'); }

  function wireEvents() {
    $('buyTab').addEventListener('click', () => selectSide('buy')); $('sellTab').addEventListener('click', () => selectSide('sell')); $('placeTrade').addEventListener('click', placeTrade);
    ['stopLoss', 'takeProfit', 'lotSize'].forEach((id) => $(id).addEventListener('input', updateRiskHint));
    $('openTrades').addEventListener('click', (event) => { const button = event.target.closest('[data-close-id]'); if (button) closeTrade(button.dataset.closeId); });
    document.querySelectorAll('.tool-button').forEach((button) => button.addEventListener('click', () => selectTool(button.dataset.tool)));
    document.querySelectorAll('#timeframes button').forEach((button) => button.addEventListener('click', () => { if (button.dataset.tf === currentTf) return; currentTf = button.dataset.tf; document.querySelectorAll('#timeframes button').forEach((item) => item.classList.toggle('active', item === button)); fetchMarketData(currentTf); }));
    $('resetChart').addEventListener('click', () => chart?.timeScale().fitContent()); $('refreshButton').addEventListener('click', () => fetchMarketData(currentTf));
    $('settingsButton').addEventListener('click', openSettings); $('closeSettings').addEventListener('click', closeSettings); $('settingsBackdrop').addEventListener('click', closeSettings); $('balanceInput').addEventListener('change', applyBalance); $('pointValueInput').addEventListener('change', () => { const value = Number($('pointValueInput').value); if (value > 0) { state.pointSize = value; saveState(); redrawDrawings(); } }); $('clearWorkspace').addEventListener('click', clearWorkspace); $('deleteDrawing').addEventListener('click', deleteSelectedDrawing); document.addEventListener('click', (event) => { if (!event.target.closest('.context-menu')) $('contextMenu').hidden = true; });
    $('historyToggle').addEventListener('click', () => $('historyPanel').classList.toggle('collapsed'));
  }

  async function boot() {
    $('balanceInput').value = state.balance; $('pointValueInput').value = state.pointSize; initChart(); wireEvents(); updateAccountUI(); selectSide('buy'); await fetchMarketData(currentTf); liveTimer = setInterval(tickMarket, 12000);
  }
  window.addEventListener('beforeunload', () => { if (liveTimer) clearInterval(liveTimer); if (chartResizeObserver) chartResizeObserver.disconnect(); });
  boot();
})();
