# Warehouse Modern Data Solution

This repository now keeps the legacy application in the `legacy/` folder and hosts a modern warehouse analytics demo in `warehouse-dwh-demo/`.

## Repository structure

- `legacy/` — original Angular application retained for historical reference
- `warehouse-dwh-demo/` — a data warehouse demo aligned to a senior DWH/BI role profile

## Demo overview

The `warehouse-dwh-demo` project demonstrates:

- dimension and fact modeling
- ETL pipeline design using Python
- SQLite warehouse creation and curated summary tables
- Power BI-ready reporting outputs
- Azure-friendly architecture mapping

## Where to start

Please read:

- `warehouse-dwh-demo/README.md`
- `warehouse-dwh-demo/dashboard/powerbi_dashboard_spec.md`

## Local run

```bash
cd warehouse-dwh-demo
python scripts/generate_demo_data.py
python scripts/build_warehouse.py
```

This builds the sample warehouse, creates summary CSVs, and prepares the project for Power BI import.

## Azure DevOps CI/CD

The repository includes an Azure DevOps pipeline at `azure-pipelines.yml`.

Pipeline behavior:
- runs on pushes to `master` and any `feature/*` branch
- runs on pull requests to `master`
- installs Python
- generates warehouse source data
- builds the SQLite warehouse and summary tables
- validates row counts in the star schema
- publishes the Power BI-ready CSV outputs as pipeline artifacts

Example CI execution:

```bash
python warehouse-dwh-demo/scripts/generate_demo_data.py
python warehouse-dwh-demo/scripts/build_warehouse.py
```

## PR status

This repository is prepared for a portfolio/demo pull request showing the migration from a legacy app to a modern warehouse analytics solution, including Azure DevOps CI/CD automation.
