from __future__ import annotations

import json
from pathlib import Path

root = Path(__file__).resolve().parents[1]
expected = {'1m': 60, '5m': 300, '15m': 900, '30m': 1800, '1h': 3600, '4h': 14400, '1d': 86400}
for timeframe, seconds in expected.items():
    path = root / ('xauusd_data.csv' if timeframe == '1d' else f'xauusd_{timeframe}.json')
    if timeframe == '1d':
        rows = path.read_text().strip().splitlines()[1:]
        count = len(rows)
    else:
        payload = json.loads(path.read_text())
        rows = payload['rows']
        count = len(rows)
        timestamps = [row['time'] for row in rows[:200] if row.get('time') is not None]
        deltas = [b - a for a, b in zip(timestamps, timestamps[1:]) if b > a]
        if not deltas or min(deltas) > seconds * 2:
            raise RuntimeError(f'{timeframe}: unexpected interval spacing {deltas[:3]}')
    if count < 20:
        raise RuntimeError(f'{timeframe}: insufficient rows {count}')
    print(f'{timeframe}: {count} distinct real candles')
