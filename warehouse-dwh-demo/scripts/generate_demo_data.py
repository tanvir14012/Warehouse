from __future__ import annotations

import csv
import random
from datetime import date, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW_DIR = ROOT / 'data' / 'raw'
RAW_DIR.mkdir(parents=True, exist_ok=True)

random.seed(42)

REGIONS = {
    'North': ['Seattle', 'Chicago', 'Minneapolis'],
    'South': ['Atlanta', 'Dallas', 'Miami'],
    'East': ['New York', 'Boston', 'Philadelphia'],
    'West': ['San Diego', 'Los Angeles', 'Portland'],
}

COUNTRIES = {
    'North': 'USA',
    'South': 'USA',
    'East': 'USA',
    'West': 'USA',
}

SEGMENTS = ['Retail', 'SMB', 'Enterprise', 'Wholesale']
PRODUCTS = [
    ('Laptop Pro 14', 'Electronics', 'Computers', 'Apex', 1299.00, 930.00),
    ('Office Headset', 'Electronics', 'Accessories', 'Echo', 189.00, 122.00),
    ('Industrial Sensor', 'Industrial', 'Automation', 'Forge', 430.00, 280.00),
    ('Warehouse Scanner', 'Industrial', 'Logistics', 'Crest', 545.00, 360.00),
    ('Ergo Chair', 'Furniture', 'Office', 'Northline', 410.00, 260.00),
    ('Standing Desk', 'Furniture', 'Office', 'Northline', 890.00, 610.00),
    ('Smart Camera', 'Electronics', 'Security', 'Signal', 640.00, 385.00),
    ('Safety Gloves', 'Warehouse', 'Safety', 'Forge', 24.00, 12.00),
    ('Packing Tape', 'Warehouse', 'Packaging', 'Crest', 18.00, 9.00),
    ('Mobile Barcode Printer', 'Electronics', 'Logistics', 'Echo', 780.00, 500.00),
    ('Delivery Robot', 'Industrial', 'Automation', 'Apex', 2450.00, 1750.00),
    ('Thermal Label Roll', 'Warehouse', 'Packaging', 'Northline', 16.00, 8.50),
]

WAREHOUSES = [
    ('WH-101', 'Seattle Hub', 'North', 'Seattle', 'USA', 3200),
    ('WH-102', 'Chicago Central', 'North', 'Chicago', 'USA', 2800),
    ('WH-103', 'Dallas West', 'South', 'Dallas', 'USA', 2600),
    ('WH-104', 'Atlanta South', 'South', 'Atlanta', 'USA', 2400),
    ('WH-105', 'New York East', 'East', 'New York', 'USA', 3100),
    ('WH-106', 'Boston Harbor', 'East', 'Boston', 'USA', 2200),
    ('WH-107', 'Los Angeles West', 'West', 'Los Angeles', 'USA', 2900),
    ('WH-108', 'Portland NW', 'West', 'Portland', 'USA', 2000),
]


def write_csv(path: Path, fieldnames: list[str], rows: list[dict]):
    with path.open('w', newline='', encoding='utf-8') as file:
        writer = csv.DictWriter(file, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


customers: list[dict] = []
for customer_id in range(1, 201):
    region = random.choice(list(REGIONS.keys()))
    city = random.choice(REGIONS[region])
    customers.append(
        {
            'customer_id': customer_id,
            'customer_name': f'Customer {customer_id}',
            'region': region,
            'city': city,
            'country': COUNTRIES[region],
            'segment': random.choice(SEGMENTS),
            'signup_date': (date(2020, 1, 1) + timedelta(days=random.randint(0, 1450))).isoformat(),
        }
    )

products: list[dict] = []
for product_id, (product_name, category, sub_category, brand, unit_price, cost_price) in enumerate(PRODUCTS, start=1):
    products.append(
        {
            'product_id': product_id,
            'product_name': product_name,
            'category': category,
            'sub_category': sub_category,
            'brand': brand,
            'unit_price': f'{unit_price:.2f}',
            'cost_price': f'{cost_price:.2f}',
        }
    )

warehouses: list[dict] = []
for warehouse_id, (warehouse_code, warehouse_name, region, city, country, capacity) in enumerate(WAREHOUSES, start=1):
    warehouses.append(
        {
            'warehouse_id': warehouse_id,
            'warehouse_code': warehouse_code,
            'warehouse_name': warehouse_name,
            'region': region,
            'city': city,
            'country': country,
            'capacity': capacity,
        }
    )

orders: list[dict] = []
start_date = date(2024, 1, 1)
end_date = date(2024, 12, 31)

def random_date_range():
    days = (end_date - start_date).days
    return (start_date + timedelta(days=random.randint(0, days))).isoformat()

for order_id in range(1, 4001):
    order_date = random_date_range()
    customer_id = random.randint(1, 200)
    product_id = random.randint(1, len(PRODUCTS))
    warehouse_id = random.randint(1, len(WAREHOUSES))
    order_qty = random.randint(1, 8)
    unit_price = float(products[product_id - 1]['unit_price'])
    discount_pct = round(random.uniform(0.00, 0.18), 2)
    shipping_cost = round(random.uniform(12.00, 85.00), 2)
    status = random.choices(
        ['Shipped', 'Pending', 'Delivered', 'Cancelled'],
        weights=[60, 10, 25, 5],
        k=1,
    )[0]
    gross_revenue = round(unit_price * order_qty * (1 - discount_pct), 2)
    gross_margin = round((unit_price - float(products[product_id - 1]['cost_price'])) * order_qty * (1 - discount_pct), 2)

    orders.append(
        {
            'order_id': order_id,
            'order_date': order_date,
            'customer_id': customer_id,
            'product_id': product_id,
            'warehouse_id': warehouse_id,
            'order_qty': order_qty,
            'unit_price': f'{unit_price:.2f}',
            'discount_pct': f'{discount_pct:.2f}',
            'shipping_cost': f'{shipping_cost:.2f}',
            'status': status,
            'gross_revenue': f'{gross_revenue:.2f}',
            'gross_margin': f'{gross_margin:.2f}',
        }
    )

write_csv(
    RAW_DIR / 'customers.csv',
    ['customer_id', 'customer_name', 'region', 'city', 'country', 'segment', 'signup_date'],
    customers,
)
write_csv(
    RAW_DIR / 'products.csv',
    ['product_id', 'product_name', 'category', 'sub_category', 'brand', 'unit_price', 'cost_price'],
    products,
)
write_csv(
    RAW_DIR / 'warehouses.csv',
    ['warehouse_id', 'warehouse_code', 'warehouse_name', 'region', 'city', 'country', 'capacity'],
    warehouses,
)
write_csv(
    RAW_DIR / 'orders.csv',
    ['order_id', 'order_date', 'customer_id', 'product_id', 'warehouse_id', 'order_qty', 'unit_price', 'discount_pct', 'shipping_cost', 'status', 'gross_revenue', 'gross_margin'],
    orders,
)

print(f'Generated {len(customers)} customers')
print(f'Generated {len(products)} products')
print(f'Generated {len(warehouses)} warehouses')
print(f'Generated {len(orders)} orders')
print(f'Data written to {RAW_DIR}')
