# Warehouse Modern Data Solution

This repository preserves the original application in `legacy/` and contains a modern warehouse analytics solution in `warehouse-dwh-demo/`.

## Business purpose

The solution supports a warehouse and fulfillment business that needs to understand:

- which products and categories generate the most revenue
- which regions and warehouses perform best
- how order volume and fulfillment status change over time
- which customer segments and product lines are most valuable
- how operational performance can be translated into executive reporting

The business process is centered on inventory, sales, fulfillment, and warehouse operations. The system captures transaction-level order activity, organizes it into a warehouse data model, and turns it into business-ready KPIs for reporting and decision-making.

## What the solution does

The platform performs the following activities:

- ingests operational order, customer, product, and warehouse data
- standardizes and prepares the records for analytical use
- builds a star-schema warehouse model using dimensions and facts
- calculates key operational and commercial KPIs
- produces Power BI-ready summary files for reporting
- supports automated validation through Azure DevOps CI/CD

## How it operates

The solution uses a simple warehouse processing flow:

1. Source data is generated in CSV format for customers, products, warehouses, and orders.
2. ETL scripts transform and load that data into SQLite tables.
3. A curated fact table stores order transactions while dimension tables capture customers, products, time, and warehouses.
4. Summary tables are generated for reporting and dashboard consumption.
5. Power BI can consume the published outputs to support business monitoring.

## Final output and deliverables

The final output of the project is a warehouse analytics package that includes:

- a structured warehouse database (`data/warehouse/warehouse_demo.db`)
- business-ready KPI summaries (`data/published/*.csv`)
- a Power BI dashboard specification (`dashboard/powerbi_dashboard_spec.md`)
- a reusable ETL and warehouse build process
- Azure DevOps CI/CD automation via `azure-pipelines.yml`

This creates a usable operational reporting foundation for warehouse leadership, commercial teams, and business analysts.

## Repository structure

- `legacy/` — original application retained for historical reference
- `warehouse-dwh-demo/` — warehouse analytics solution
- `azure-pipelines.yml` — Azure DevOps CI/CD pipeline

## Where to start

Read:

- `warehouse-dwh-demo/README.md`
- `warehouse-dwh-demo/dashboard/powerbi_dashboard_spec.md`

## Local run

```bash
cd warehouse-dwh-demo
python scripts/generate_demo_data.py
python scripts/build_warehouse.py
```

This creates the sample warehouse data, loads the modeled tables, and prepares the reporting outputs.

## Azure DevOps CI/CD

The repository includes an Azure DevOps pipeline at `azure-pipelines.yml`.

Pipeline behavior:
- runs on pushes to `master` and any `feature/*` branch
- runs on pull requests to `master`
- installs Python
- generates warehouse source data
- builds the SQLite warehouse and summary tables
- validates row counts and totals in the warehouse model
- publishes Power BI-ready artifacts

Example CI execution:

```bash
python warehouse-dwh-demo/scripts/generate_demo_data.py
python warehouse-dwh-demo/scripts/build_warehouse.py
```
