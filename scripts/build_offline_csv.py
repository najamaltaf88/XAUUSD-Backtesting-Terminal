from __future__ import annotations

import csv
import json
import time
from pathlib import Path
from urllib.request import Request, urlopen

root = Path(__file__).resolve().parents[1]
start = int(time.mktime(time.strptime('2024-01-01', '%Y-%m-%d')))
end = int(time.mktime(time.strptime('2026-08-23', '%Y-%m-%d')))
url = (
    'https://query1.finance.yahoo.com/v8/finance/chart/GC=F'
    f'?interval=1d&period1={start}&period2={end}&events=history'
)
request = Request(url, headers={'User-Agent': 'Mozilla/5.0'})
with urlopen(request, timeout=30) as response:
    payload = json.load(response)
result = payload['chart']['result'][0]
quote = result['indicators']['quote'][0]
rows = []
for timestamp, opening, high, low, close, volume in zip(
    result.get('timestamp', []),
    quote.get('open', []),
    quote.get('high', []),
    quote.get('low', []),
    quote.get('close', []),
    quote.get('volume', []),
):
    if all(value is not None for value in (opening, high, low, close)):
        rows.append({
            'date': time.strftime('%Y-%m-%d', time.gmtime(timestamp)),
            'open': f'{float(opening):.2f}',
            'high': f'{float(high):.2f}',
            'low': f'{float(low):.2f}',
            'close': f'{float(close):.2f}',
            'volume': int(volume or 0),
        })
if len(rows) < 300:
    raise RuntimeError(f'Expected real 2024–2026 history; received only {len(rows)} rows')
output = root / 'xauusd_data.csv'
with output.open('w', newline='') as file:
    writer = csv.DictWriter(file, fieldnames=['date', 'open', 'high', 'low', 'close', 'volume'])
    writer.writeheader()
    writer.writerows(rows)
print(f'Wrote {len(rows)} real Yahoo gold daily candles to {output}')
print(f'Range: {rows[0]["date"]} → {rows[-1]["date"]}')
print(f'Latest close: {rows[-1]["close"]}')
