DROP VIEW IF EXISTS vw_daily_sales;
DROP TABLE IF EXISTS fact_order;
DROP TABLE IF EXISTS dim_date;
DROP TABLE IF EXISTS dim_customer;
DROP TABLE IF EXISTS dim_product;
DROP TABLE IF EXISTS dim_warehouse;

CREATE TABLE dim_customer (
    customer_id INTEGER PRIMARY KEY,
    customer_name TEXT NOT NULL,
    region TEXT NOT NULL,
    city TEXT NOT NULL,
    country TEXT NOT NULL,
    segment TEXT NOT NULL,
    signup_date TEXT NOT NULL
);

CREATE TABLE dim_product (
    product_id INTEGER PRIMARY KEY,
    product_name TEXT NOT NULL,
    category TEXT NOT NULL,
    sub_category TEXT NOT NULL,
    brand TEXT NOT NULL,
    unit_price REAL NOT NULL,
    cost_price REAL NOT NULL
);

CREATE TABLE dim_warehouse (
    warehouse_id INTEGER PRIMARY KEY,
    warehouse_code TEXT NOT NULL,
    warehouse_name TEXT NOT NULL,
    region TEXT NOT NULL,
    city TEXT NOT NULL,
    country TEXT NOT NULL,
    capacity INTEGER NOT NULL
);

CREATE TABLE dim_date (
    date_key INTEGER PRIMARY KEY,
    calendar_date TEXT NOT NULL,
    year INTEGER NOT NULL,
    month_number INTEGER NOT NULL,
    month_name TEXT NOT NULL,
    quarter INTEGER NOT NULL,
    day_of_week TEXT NOT NULL
);

CREATE TABLE fact_order (
    order_id INTEGER PRIMARY KEY,
    order_date TEXT NOT NULL,
    customer_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    warehouse_id INTEGER NOT NULL,
    order_qty INTEGER NOT NULL,
    unit_price REAL NOT NULL,
    discount_pct REAL NOT NULL,
    shipping_cost REAL NOT NULL,
    status TEXT NOT NULL,
    gross_revenue REAL NOT NULL,
    gross_margin REAL NOT NULL,
    FOREIGN KEY (customer_id) REFERENCES dim_customer(customer_id),
    FOREIGN KEY (product_id) REFERENCES dim_product(product_id),
    FOREIGN KEY (warehouse_id) REFERENCES dim_warehouse(warehouse_id)
);

CREATE VIEW vw_daily_sales AS
SELECT
    d.calendar_date,
    c.region,
    w.warehouse_name,
    p.category,
    SUM(f.gross_revenue) AS revenue,
    SUM(f.gross_margin) AS gross_margin,
    COUNT(*) AS total_orders,
    SUM(f.order_qty) AS units_sold
FROM fact_order f
JOIN dim_date d ON d.calendar_date = f.order_date
JOIN dim_customer c ON c.customer_id = f.customer_id
JOIN dim_product p ON p.product_id = f.product_id
JOIN dim_warehouse w ON w.warehouse_id = f.warehouse_id
GROUP BY d.calendar_date, c.region, w.warehouse_name, p.category;
