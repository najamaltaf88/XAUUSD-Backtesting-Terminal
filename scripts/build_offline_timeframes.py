from __future__ import annotations

import json
import time
from pathlib import Path
from urllib.parse import quote
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
END = int(time.time())
CONFIG = {
    '1m': ('1m', '7d'),
    '5m': ('5m', '60d'),
    '15m': ('15m', '60d'),
    '30m': ('30m', '60d'),
    '1h': ('1h', '2y'),
    '4h': ('1h', '2y'),
    '1d': ('1d', '5y'),
}

def fetch(interval: str, range_: str):
    url = f'https://query1.finance.yahoo.com/v8/finance/chart/{quote("GC=F")}?interval={interval}&range={range_}&period2={END}&events=history'
    request = Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urlopen(request, timeout=60) as response:
        payload = json.load(response)
    result = payload['chart']['result'][0]
    quote_data = result['indicators']['quote'][0]
    rows = []
    for i, timestamp in enumerate(result.get('timestamp', [])):
        values = [quote_data.get(key, [None] * len(result.get('timestamp', [])))[i] for key in ('open', 'high', 'low', 'close')]
        if all(value is not None for value in values):
            rows.append({'time': int(timestamp), 'open': float(values[0]), 'high': float(values[1]), 'low': float(values[2]), 'close': float(values[3]), 'volume': int((quote_data.get('volume') or [0] * len(result.get('timestamp', [])))[i] or 0)})
    return rows

def aggregate(rows, seconds):
    buckets = {}
    for row in rows:
        bucket = (row['time'] // seconds) * seconds
        existing = buckets.get(bucket)
        if existing is None:
            buckets[bucket] = {**row, 'time': bucket}
        else:
            existing['high'] = max(existing['high'], row['high'])
            existing['low'] = min(existing['low'], row['low'])
            existing['close'] = row['close']
            existing['volume'] += row['volume']
    return sorted(buckets.values(), key=lambda row: row['time'])

for tf, (interval, range_) in CONFIG.items():
    rows = fetch(interval, range_)
    if tf == '4h':
        rows = aggregate(rows, 4 * 60 * 60)
    elif tf == '1d':
        rows = [row for row in rows if time.strftime('%Y-%m-%d', time.gmtime(row['time'])) >= '2024-01-01']
    if len(rows) < 20:
        raise RuntimeError(f'{tf}: only {len(rows)} rows returned')
    output = ROOT / f'xauusd_{tf}.json'
    output.write_text(json.dumps({'symbol': 'GC=F', 'source': 'Yahoo Finance gold futures proxy', 'timeframe': tf, 'rows': rows}, separators=(',', ':')))
    print(f'{tf}: {len(rows)} rows, {time.strftime("%Y-%m-%d %H:%M", time.gmtime(rows[0]["time"]))} → {time.strftime("%Y-%m-%d %H:%M", time.gmtime(rows[-1]["time"]))}, close {rows[-1]["close"]:.2f}')
