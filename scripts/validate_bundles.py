from __future__ import annotations

import csv
import json
import math
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXPECTED = {'1m': 60, '5m': 300, '15m': 900, '30m': 1800, '1h': 3600, '4h': 14400, '1d': 86400}


def epoch_day(value: str) -> int:
    return int(datetime.strptime(value, '%Y-%m-%d').replace(tzinfo=timezone.utc).timestamp())


def validate_rows(timeframe: str, rows: list[dict], metadata: dict) -> dict:
    seconds = EXPECTED[timeframe]
    times = []
    invalid_ohlc = 0
    invalid_values = 0
    for row in rows:
        try:
            values = [float(row[k]) for k in ('open', 'high', 'low', 'close')]
            timestamp = int(row['time'])
            volume = float(row.get('volume', 0) or 0)
            if not all(math.isfinite(v) for v in values + [timestamp, volume]) or min(values) <= 0:
                invalid_values += 1
            if values[1] < max(values[0], values[3]) or values[2] > min(values[0], values[3]) or values[1] < values[2]:
                invalid_ohlc += 1
            times.append(timestamp)
        except (KeyError, TypeError, ValueError, OverflowError):
            invalid_values += 1
    duplicates = len(times) - len(set(times))
    ordering_errors = sum(1 for a, b in zip(times, times[1:]) if b <= a)
    deltas = [b - a for a, b in zip(times, times[1:]) if b > a]
    suspicious_gaps = sum(1 for delta in deltas if delta > seconds * 2)
    report = {
        'symbol': metadata.get('symbol', 'GC=F'),
        'provider': metadata.get('source', 'unknown'),
        'timeframe': timeframe,
        'start': datetime.fromtimestamp(times[0], timezone.utc).isoformat() if times else None,
        'end': datetime.fromtimestamp(times[-1], timezone.utc).isoformat() if times else None,
        'candleCount': len(rows),
        'duplicates': duplicates,
        'orderingErrors': ordering_errors,
        'gaps': suspicious_gaps,
        'invalidOHLC': invalid_ohlc,
        'invalidValues': invalid_values,
        'minIntervalSeconds': min(deltas) if deltas else None,
        'maxIntervalSeconds': max(deltas) if deltas else None,
        'timezone': 'UTC',
        'expectedIntervalSeconds': seconds,
    }
    if not rows or duplicates or ordering_errors or invalid_ohlc or invalid_values:
        raise RuntimeError(f'{timeframe}: invalid data {report}')
    return report


reports = []
for timeframe, seconds in EXPECTED.items():
    if timeframe == '1d':
        path = ROOT / 'xauusd_data.csv'
        csv_rows = list(csv.DictReader(path.open(newline='')))
        rows = [{**row, 'time': epoch_day(row['date'])} for row in csv_rows]
        metadata = {'symbol': 'GC=F', 'source': 'Yahoo Finance gold futures proxy (CSV offline fallback)', 'timeframe': timeframe}
    else:
        path = ROOT / f'xauusd_{timeframe}.json'
        payload = json.loads(path.read_text())
        rows = payload.get('rows', [])
        metadata = payload
        if payload.get('timeframe') != timeframe:
            raise RuntimeError(f'{timeframe}: embedded timeframe mismatch: {payload.get("timeframe")}')
        if payload.get('symbol') != 'GC=F':
            raise RuntimeError(f'{timeframe}: offline symbol must be explicitly GC=F, got {payload.get("symbol")}')
    reports.append(validate_rows(timeframe, rows, metadata))

print(json.dumps(reports, indent=2))
