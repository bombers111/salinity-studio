# Salinity Studio

A browser-based dashboard built from the three original Excel workbooks in `models/`. The calculation engine now runs **in each visitor's browser**: field inputs and measure selections are not sent to a server. The workbooks and their reference data are shipped with the site, so **those source files are public when published on GitHub Pages**.

## Run locally

With Node.js 22+ and npm installed:

```sh
npm ci
npm start
```

Or on the original Mac, use `start.command`. Open http://127.0.0.1:4173/. The dev server serves files only; HyperFormula calculates locally in the browser. Inputs are session-only and are lost on refresh.

## Build and publish to GitHub Pages

```sh
npm ci
npm test
npm run build
```

The static `dist/` folder can be served by GitHub Pages; no Python or Node is needed for visitors. The repository includes `.github/workflows/deploy.yml`. To publish: create a GitHub repository, push this project to its `main` branch, and set **Settings → Pages → Build and deployment → GitHub Actions**. On the next push, the workflow builds and deploys the site. GitHub Pages uses the repository-relative URL correctly (`./` Vite base).

**Before pushing:** review `models/` for information you don't want publicly downloadable. Do not commit real field measurements or private files. GitHub Pages and browser developer tools expose all shipped workbook formulas and example data. The app does not have accounts or save visitor inputs.

## Coverage and limits

- A public GIS screening map uses OpenFreeMap/OpenStreetMap as the basemap and a colourized FAO GDVI soil-salinity indicator layer. See [`public/data/SOURCE.md`](public/data/SOURCE.md) for origin, transformation, attribution and caveats. The raster is a coarse relative indicator, **not measured ECe**; it does not populate workbook inputs. No local field samples are required or included. Map tile requests go to OpenFreeMap; calculated workbook inputs stay in the browser.
- The field checklist, all its dropdowns and manual entries, 21 live measure suitability statuses, selected-measure plan, reset and adjustable thresholds are implemented from the diagnosis workbook.
- The scenario exposes crop, soil, climate and irrigation controls, 10-year trajectory, editable crop database and climate presets.
- Both optimized and manual versions of the older water-balance workbook have editable monthly schedules.
- All original worksheets are browsable; original `.xlsx` files can be downloaded. Excel formatting/charts are not reproduced.
- The three spreadsheets remain **different models**. Their measured inputs default to blank in the UI; the scenario workbook still has example defaults. Do not interpret its output as a forecast for a location on the map. Shared measurements map to a few corresponding cells only when entered. Selecting a measure does not change the scenario projection: the original files contain no formula for that link. Never use this prototype for engineering or agronomic decisions without checking results in Excel and validating the assumptions with local measurements.
- HyperFormula (GPLv3) differs from Excel for two decorative `TEXT()` labels. One source advisor row mistakenly references explanatory text and is held at its cached unsuitable result. Tests compare selected calculated results, not every possible input combination.
