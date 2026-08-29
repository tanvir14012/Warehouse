from __future__ import annotations

import csv
import sqlite3
from datetime import date, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCHEMA_PATH = ROOT / 'sql' / 'warehouse_schema.sql'
RAW_DIR = ROOT / 'data' / 'raw'
DB_PATH = ROOT / 'data' / 'warehouse' / 'warehouse_demo.db'
PUBLISHED_DIR = ROOT / 'data' / 'published'
PUBLISHED_DIR.mkdir(parents=True, exist_ok=True)
DB_PATH.parent.mkdir(parents=True, exist_ok=True)
if DB_PATH.exists():
    DB_PATH.unlink()


def load_csv(path: Path):
    with path.open('r', newline='', encoding='utf-8') as file:
        return list(csv.DictReader(file))


conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

schema_sql = SCHEMA_PATH.read_text(encoding='utf-8')
cur.executescript(schema_sql)

# Load dimensions
for table_name, csv_name in [
    ('dim_customer', 'customers.csv'),
    ('dim_product', 'products.csv'),
    ('dim_warehouse', 'warehouses.csv'),
]:
    rows = load_csv(RAW_DIR / csv_name)
    columns = list(rows[0].keys())
    placeholders = ', '.join(['?'] * len(columns))
    insert_sql = f"INSERT INTO {table_name} ({', '.join(columns)}) VALUES ({placeholders})"
    cur.executemany(insert_sql, [tuple(row[col] for col in columns) for row in rows])

# Build date dimension for 2024
start = date(2024, 1, 1)
end = date(2024, 12, 31)
current = start
while current <= end:
    day_key = int(current.strftime('%Y%m%d'))
    cur.execute(
        "INSERT INTO dim_date (date_key, calendar_date, year, month_number, month_name, quarter, day_of_week) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (
            day_key,
            current.isoformat(),
            current.year,
            current.month,
            current.strftime('%B'),
            ((current.month - 1) // 3) + 1,
            current.strftime('%A'),
        ),
    )
    current += timedelta(days=1)

# Load fact table
rows = load_csv(RAW_DIR / 'orders.csv')
for row in rows:
    cur.execute(
        """
        INSERT INTO fact_order (
            order_id, order_date, customer_id, product_id, warehouse_id,
            order_qty, unit_price, discount_pct, shipping_cost, status,
            gross_revenue, gross_margin
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            int(row['order_id']),
            row['order_date'],
            int(row['customer_id']),
            int(row['product_id']),
            int(row['warehouse_id']),
            int(row['order_qty']),
            float(row['unit_price']),
            float(row['discount_pct']),
            float(row['shipping_cost']),
            row['status'],
            float(row['gross_revenue']),
            float(row['gross_margin']),
        ),
    )

conn.commit()

summary_rows = cur.execute(
    """
    SELECT
        d.month_name,
        d.year,
        c.region,
        p.category,
        COUNT(f.order_id) AS total_orders,
        SUM(f.order_qty) AS units_sold,
        ROUND(SUM(f.gross_revenue), 2) AS gross_revenue,
        ROUND(SUM(f.gross_margin), 2) AS gross_margin,
        ROUND(AVG(f.gross_revenue), 2) AS avg_order_value,
        ROUND(AVG(CASE WHEN f.status = 'Delivered' OR f.status = 'Shipped' THEN 1 ELSE 0 END) * 100, 2) AS fulfillment_rate_pct
    FROM fact_order f
    JOIN dim_date d ON d.calendar_date = f.order_date
    JOIN dim_customer c ON c.customer_id = f.customer_id
    JOIN dim_product p ON p.product_id = f.product_id
    GROUP BY d.year, d.month_number, d.month_name, c.region, p.category
    ORDER BY d.year, d.month_number, c.region, p.category
    """
).fetchall()

summary_headers = [
    'year', 'month_name', 'region', 'category', 'total_orders', 'units_sold',
    'gross_revenue', 'gross_margin', 'avg_order_value', 'fulfillment_rate_pct'
]
summary_path = PUBLISHED_DIR / 'warehouse_sales_summary.csv'
with summary_path.open('w', newline='', encoding='utf-8') as file:
    writer = csv.writer(file)
    writer.writerow(summary_headers)
    for row in summary_rows:
        writer.writerow(row)

warehouse_summary_rows = cur.execute(
    """
    SELECT
        w.warehouse_name,
        w.region,
        COUNT(f.order_id) AS total_orders,
        ROUND(SUM(f.gross_revenue), 2) AS revenue,
        ROUND(SUM(f.gross_margin), 2) AS gross_margin,
        ROUND(AVG(f.gross_revenue), 2) AS avg_order_value,
        ROUND((SUM(CASE WHEN f.status IN ('Delivered', 'Shipped') THEN 1 ELSE 0 END) * 100.0) / COUNT(f.order_id), 2) AS on_time_pct
    FROM fact_order f
    JOIN dim_warehouse w ON w.warehouse_id = f.warehouse_id
    GROUP BY w.warehouse_name, w.region
    ORDER BY revenue DESC
    """
).fetchall()

warehouse_summary_path = PUBLISHED_DIR / 'warehouse_performance_summary.csv'
with warehouse_summary_path.open('w', newline='', encoding='utf-8') as file:
    writer = csv.writer(file)
    writer.writerow(['warehouse_name', 'region', 'total_orders', 'revenue', 'gross_margin', 'avg_order_value', 'on_time_pct'])
    for row in warehouse_summary_rows:
        writer.writerow(row)

print(f'Warehouse database created at {DB_PATH}')
print(f'Published summary created at {summary_path}')
print(f'Warehouse performance summary created at {warehouse_summary_path}')
print(f'Fact orders inserted: {cur.execute("SELECT COUNT(*) FROM fact_order").fetchone()[0]}')

conn.close()
