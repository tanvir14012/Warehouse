# Power BI Dashboard Specification

## Dashboard objective

The dashboard gives warehouse and commercial stakeholders a fast view of operating performance by time, region, warehouse, and product class.

## Page 1: Executive Overview

### Visuals
- KPI cards:
  - Total Revenue
  - Total Orders
  - Gross Margin
  - Avg Order Value
- Line chart:
  - Revenue by month
- Bar chart:
  - Revenue by region
- Matrix:
  - Category performance summary

### Key measures
- Total Revenue = SUM(gross_revenue)
- Total Orders = SUM(total_orders)
- Gross Margin = SUM(gross_margin)
- Avg Order Value = DIVIDE([Total Revenue], [Total Orders])

## Page 2: Warehouse Performance

### Visuals
- Column chart: revenue by warehouse
- KPI cards: fulfillment rate, total shipments, avg ship cost
- Map: warehouse location by region
- Table: warehouse margin ranking

### Key measures
- On-Time Fulfillment % = DIVIDE(CALCULATE(COUNTROWS(...)), COUNTROWS(...))
- Total Ship Cost = SUM(shipping_cost)

## Page 3: Product and Customer Analysis

### Visuals
- Top products by revenue
- Top segments by revenue
- Treemap: category vs revenue
- Customer retention and segmentation view

## Page 4: Operational Health

### Visuals
- Shipment status breakdown
- Warehouse load by month
- Order backlog by queue status
- Exception flags and low-margin orders

## Data source

Use the exported CSV files from the warehouse demo:

- `data/published/warehouse_sales_summary.csv`
- `data/published/warehouse_performance_summary.csv`

## Recommended design principles

- Keep the executive page uncluttered and decision-oriented
- Use consistent color coding for regions and warehouses
- Use callout cards for key KPI thresholds
- Design with filters for date, segment, region, and category
- Show both operational and commercial views to balance business and logistics stakeholders

## Example DAX formulas

```DAX
Total Revenue = SUM('warehouse_sales_summary'[gross_revenue])
Gross Margin = SUM('warehouse_sales_summary'[gross_margin])
Margin % = DIVIDE([Gross Margin], [Total Revenue])
Avg Order Value = DIVIDE([Total Revenue], SUM('warehouse_sales_summary'[total_orders]))
```

## Suggested filter pane fields

- Year
- Month Name
- Region
- Category
- Warehouse Name
- Segment

## Deliverable narrative

This dashboard demonstrates an enterprise-ready reporting view: it takes raw operational data, models it into a warehouse-friendly structure, and produces clear decision metrics for business stakeholders.
